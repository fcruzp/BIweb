'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from './AuthProvider';
import {
  LogIn,
  LogOut,
  Settings,
  Loader2,
  UserCircle,
  CreditCard,
} from 'lucide-react';

function getInitials(name: string | undefined | null, email: string | undefined | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return 'U';
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: 'bg-gray-500/10 text-gray-500' },
  supporter: { label: 'Supporter', color: 'bg-amber-500/10 text-amber-500' },
  starter: { label: 'Starter', color: 'bg-blue-500/10 text-blue-500' },
  pro: { label: 'Pro', color: 'bg-emerald-500/10 text-emerald-500' },
  business: { label: 'Business', color: 'bg-purple-500/10 text-purple-500' },
};

export function UserMenu() {
  const { user, isAuthenticated, isLoading, openAuthModal, signOut, dbUser } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email || '';
  const userEmail = user?.email ?? '';
  const avatarUrl = user?.user_metadata?.avatar_url ?? '';
  const initials = getInitials(user?.user_metadata?.full_name, user?.email);

  const planInfo = dbUser?.subscription
    ? PLAN_LABELS[dbUser.subscription.plan] ?? PLAN_LABELS.free
    : PLAN_LABELS.free;

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled className="text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openAuthModal('signin')}
        className="text-gray-300 hover:text-white hover:bg-gray-800 gap-1.5"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Sign In</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full ring-2 ring-gray-700 hover:ring-emerald-500/50 transition-all"
        >
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-emerald-600/20 text-emerald-400 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-gray-950 border-gray-800"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white leading-none">
                {displayName || 'User'}
              </p>
              <Badge variant="secondary" className={`h-4 text-[8px] px-1 ${planInfo.color}`}>
                {planInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 leading-none">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuGroup>
          <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-gray-800 cursor-pointer">
            <UserCircle className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-gray-800 cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" />
            Subscription
          </DropdownMenuItem>
          <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-gray-800 cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuItem
          className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
