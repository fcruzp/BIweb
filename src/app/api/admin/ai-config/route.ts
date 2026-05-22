import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { createCompletion, invalidateAIConfigCache } from '@/lib/ai';
import OpenAI from 'openai';

// ============================================================
// GET /api/admin/ai-config — Read current AI configuration
// ============================================================

export async function GET() {
  try {
    // Require admin role
    const user = await requireAuth();
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const config = await db.aiConfig.findUnique({ where: { id: 'global' } });

    if (!config) {
      // Return defaults — no config saved yet
      return NextResponse.json({
        source: 'env',
        apiKey: process.env.OPENROUTER_API_KEY ? `***${process.env.OPENROUTER_API_KEY.slice(-4)}` : null,
        hasKey: !!process.env.OPENROUTER_API_KEY,
        model: process.env.AI_DEFAULT_MODEL || 'google/gemini-2.5-flash',
        baseUrl: 'https://openrouter.ai/api/v1',
        isActive: false,
        lastVerified: null,
      });
    }

    // Mask the API key for security
    const maskedKey = config.apiKey
      ? `***${config.apiKey.slice(-4)}`
      : null;

    return NextResponse.json({
      source: 'database',
      apiKey: maskedKey,
      hasKey: !!config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
      isActive: config.isActive,
      lastVerified: config.lastVerified,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Admin/AiConfig] GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// PUT /api/admin/ai-config — Update AI configuration
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    // Require admin role
    const user = await requireAuth();
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { apiKey, model, baseUrl, isActive } = body as {
      apiKey?: string;
      model?: string;
      baseUrl?: string;
      isActive?: boolean;
    };

    // Validate model is not empty
    if (model !== undefined && !model.trim()) {
      return NextResponse.json({ error: 'Model cannot be empty' }, { status: 400 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (apiKey !== undefined) updateData.apiKey = apiKey || null;
    if (model !== undefined) updateData.model = model.trim();
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    // Upsert the config (create if doesn't exist)
    const config = await db.aiConfig.upsert({
      where: { id: 'global' },
      update: updateData,
      create: {
        id: 'global',
        apiKey: apiKey || null,
        model: model?.trim() || 'google/gemini-2.5-flash',
        baseUrl: baseUrl?.trim() || 'https://openrouter.ai/api/v1',
        isActive: isActive ?? true,
      },
    });

    // Invalidate the AI config cache so the next request picks up changes
    invalidateAIConfigCache();

    // Mask the API key for response
    const maskedKey = config.apiKey
      ? `***${config.apiKey.slice(-4)}`
      : null;

    console.log(`[Admin/AiConfig] Updated: model=${config.model}, hasKey=${!!config.apiKey}, active=${config.isActive}`);

    return NextResponse.json({
      success: true,
      apiKey: maskedKey,
      hasKey: !!config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
      isActive: config.isActive,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Admin/AiConfig] PUT error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// POST /api/admin/ai-config — Test the AI connection
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // Require admin role
    const user = await requireAuth();
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { apiKey, model, baseUrl } = body as {
      apiKey?: string;
      model?: string;
      baseUrl?: string;
    };

    // Use provided values or fall back to DB/env config
    const testKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    const testModel = model || 'google/gemini-2.5-flash';
    const testBaseUrl = baseUrl || 'https://openrouter.ai/api/v1';

    if (!testKey) {
      return NextResponse.json({
        success: false,
        error: 'No API key provided or found in configuration',
      }, { status: 400 });
    }

    const startTime = Date.now();

    // Test with a direct OpenAI client using the provided credentials
    const testClient = new OpenAI({
      apiKey: testKey,
      baseURL: testBaseUrl,
      defaultHeaders: {
        'HTTP-Referer': 'https://datamind.bi',
        'X-Title': 'DataMind BI',
      },
    });

    const completion = await testClient.chat.completions.create({
      model: testModel,
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Respond briefly.' },
        { role: 'user', content: 'Say "Connection successful" in exactly 2 words.' },
      ],
      temperature: 0,
      max_tokens: 20,
    });

    const content = completion.choices[0]?.message?.content || '(empty)';
    const timingMs = Date.now() - startTime;

    // If testing the currently-saved config, update lastVerified
    if (!apiKey && !model && !baseUrl) {
      try {
        await db.aiConfig.update({
          where: { id: 'global' },
          data: { lastVerified: new Date() },
        });
      } catch { /* ignore if no config row exists */ }
    }

    return NextResponse.json({
      success: true,
      provider: 'openrouter',
      model: testModel,
      response: content,
      timing_ms: timingMs,
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
      },
    });
  } catch (error) {
    const errInfo = error instanceof Error
      ? { message: error.message, name: error.name }
      : { message: String(error) };

    console.error('[Admin/AiConfig] Test FAILED:', errInfo);

    // Parse common OpenRouter errors
    let hint = '';
    if (errInfo.message.includes('401') || errInfo.message.includes('Incorrect API key')) {
      hint = 'API key is invalid or expired. Check your OpenRouter dashboard.';
    } else if (errInfo.message.includes('402') || errInfo.message.includes('Insufficient credits')) {
      hint = 'API key has insufficient credits. Top up at openrouter.ai/credits.';
    } else if (errInfo.message.includes('403')) {
      hint = 'API key does not have access to this model.';
    } else if (errInfo.message.includes('429')) {
      hint = 'Rate limited. Try again in a few seconds.';
    } else if (errInfo.message.includes('model')) {
      hint = 'Model not found or not available. Check the model ID at openrouter.ai/models.';
    }

    return NextResponse.json({
      success: false,
      error: errInfo.message,
      hint,
    }, { status: 503 });
  }
}
