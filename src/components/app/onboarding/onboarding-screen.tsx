'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Sparkles,
    BarChart3,
    Brain,
    TrendingUp,
    Target,
    ArrowRight,
    ArrowLeft,
    SkipForward,
    Database,
    Rocket,
    ShoppingCart,
    Megaphone,
    DollarSign,
    Settings,
    Users,
    HelpCircle,
    Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface OnboardingScreenProps {
    onComplete: (loadDemoData: boolean) => void
}

const steps = [
    { id: 'welcome', title: 'Bienvenido a DataMind', icon: Sparkles },
    { id: 'features', title: 'Qué podés hacer', icon: BarChart3 },
    { id: 'interest', title: 'Tu área de interés', icon: Target },
    { id: 'start', title: 'Empezá a explorar', icon: Rocket },
]

const interestAreas = [
    { id: 'ventas', label: 'Ventas', icon: ShoppingCart, color: 'emerald' },
    { id: 'marketing', label: 'Marketing', icon: Megaphone, color: 'teal' },
    { id: 'finanzas', label: 'Finanzas', icon: DollarSign, color: 'amber' },
    { id: 'operaciones', label: 'Operaciones', icon: Settings, color: 'rose' },
    { id: 'rrhh', label: 'Recursos Humanos', icon: Users, color: 'violet' },
    { id: 'otro', label: 'Otro', icon: HelpCircle, color: 'slate' },
]

const features = [
    {
        icon: BarChart3,
        title: 'Análisis de Datos',
        description: 'Subí tus datos y obtené visualizaciones automáticas con gráficos interactivos.',
    },
    {
        icon: Brain,
        title: 'Insights con IA',
        description: 'Nuestra IA analiza tus datos y te muestra patrones, tendencias y oportunidades.',
    },
    {
        icon: TrendingUp,
        title: 'Seguimiento de KPIs',
        description: 'Monitoreá tus indicadores clave en tiempo real con dashboards personalizables.',
    },
    {
        icon: Target,
        title: 'Predicciones',
        description: 'Anticipá tendencias futuras basándote en tus datos históricos.',
    },
]

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [selectedInterest, setSelectedInterest] = useState<string | null>(null)
    const [loadDemo, setLoadDemo] = useState(true)

    const handleNext = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1)
        }
    }, [currentStep])

    const handlePrev = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
        }
    }, [currentStep])

    const handleComplete = useCallback(() => {
        onComplete(loadDemo)
    }, [onComplete, loadDemo])

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0,
        }),
    }

    const [direction, setDirection] = useState(0)

    const goNext = () => {
        setDirection(1)
        handleNext()
    }

    const goPrev = () => {
        setDirection(-1)
        handlePrev()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-teal-500/5 rounded-full blur-3xl" />
                <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-emerald-500/3 rounded-full blur-2xl animate-pulse" />
            </div>

            <div className="relative z-10 w-full max-w-2xl mx-4">
                {/* Skip button */}
                <div className="flex justify-end mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleComplete}
                        className="text-white/40 hover:text-white/70 hover:bg-white/5"
                    >
                        Saltar <SkipForward className="ml-1 h-3 w-3" />
                    </Button>
                </div>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex items-center gap-2">
                            <motion.div
                                className={cn(
                                    'w-2.5 h-2.5 rounded-full transition-all duration-300',
                                    index === currentStep
                                        ? 'bg-emerald-400 w-8'
                                        : index < currentStep
                                            ? 'bg-emerald-400/60'
                                            : 'bg-white/20'
                                )}
                                layout
                            />
                        </div>
                    ))}
                </div>

                {/* Step content */}
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
                            <div className="p-8 md:p-10">
                                {/* Step 1: Welcome */}
                                {currentStep === 0 && (
                                    <div className="text-center space-y-6">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                                            className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25"
                                        >
                                            <Sparkles className="h-10 w-10 text-white" />
                                        </motion.div>
                                        <div>
                                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                                                Bienvenido a DataMind
                                            </h1>
                                            <p className="text-lg text-white/60 max-w-md mx-auto">
                                                Tu plataforma de análisis de datos impulsada por inteligencia artificial.
                                                Transformá datos en decisiones.
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-center gap-6 pt-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-emerald-400">10K+</div>
                                                <div className="text-xs text-white/40">Usuarios</div>
                                            </div>
                                            <div className="w-px h-10 bg-white/10" />
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-teal-400">50M+</div>
                                                <div className="text-xs text-white/40">Datos procesados</div>
                                            </div>
                                            <div className="w-px h-10 bg-white/10" />
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-emerald-400">98%</div>
                                                <div className="text-xs text-white/40">Precisión IA</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Features */}
                                {currentStep === 1 && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-8">
                                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                                Qué podés hacer
                                            </h2>
                                            <p className="text-white/50">Herramientas poderosas para entender tus datos</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {features.map((feature, idx) => (
                                                <motion.div
                                                    key={feature.title}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.1 }}
                                                    className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 hover:border-emerald-500/20 transition-all duration-200"
                                                >
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                                        <feature.icon className="h-5 w-5 text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                                                        <p className="text-xs text-white/50 mt-1">{feature.description}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Interest area */}
                                {currentStep === 2 && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-8">
                                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                                Elegí tu área de interés
                                            </h2>
                                            <p className="text-white/50">Personalizaremos tu experiencia</p>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {interestAreas.map((area, idx) => (
                                                <motion.button
                                                    key={area.id}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    onClick={() => setSelectedInterest(area.id)}
                                                    className={cn(
                                                        'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200',
                                                        selectedInterest === area.id
                                                            ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                                                            : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            'w-10 h-10 rounded-lg flex items-center justify-center',
                                                            selectedInterest === area.id
                                                                ? 'bg-emerald-500/20'
                                                                : 'bg-white/5'
                                                        )}
                                                    >
                                                        <area.icon
                                                            className={cn(
                                                                'h-5 w-5',
                                                                selectedInterest === area.id
                                                                    ? 'text-emerald-400'
                                                                    : 'text-white/50'
                                                            )}
                                                        />
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            'text-sm font-medium',
                                                            selectedInterest === area.id
                                                                ? 'text-emerald-300'
                                                                : 'text-white/70'
                                                        )}
                                                    >
                                                        {area.label}
                                                    </span>
                                                    {selectedInterest === area.id && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                                                        >
                                                            <Check className="h-3 w-3 text-white" />
                                                        </motion.div>
                                                    )}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Start */}
                                {currentStep === 3 && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-8">
                                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                                Empezá a explorar
                                            </h2>
                                            <p className="text-white/50">¿Cómo querés comenzar?</p>
                                        </div>
                                        <div className="space-y-3">
                                            <motion.button
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 }}
                                                onClick={() => setLoadDemo(true)}
                                                className={cn(
                                                    'w-full flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 text-left',
                                                    loadDemo
                                                        ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/8'
                                                )}
                                            >
                                                <div className={cn(
                                                    'w-12 h-12 rounded-xl flex items-center justify-center',
                                                    loadDemo ? 'bg-emerald-500/20' : 'bg-white/5'
                                                )}>
                                                    <Database className={cn(
                                                        'h-6 w-6',
                                                        loadDemo ? 'text-emerald-400' : 'text-white/50'
                                                    )} />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className={cn(
                                                        'font-semibold',
                                                        loadDemo ? 'text-emerald-300' : 'text-white'
                                                    )}>
                                                        Cargar datos de demostración
                                                    </h3>
                                                    <p className="text-xs text-white/50 mt-1">
                                                        Explorá la plataforma con datos de ejemplo ya cargados
                                                    </p>
                                                </div>
                                                {loadDemo && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
                                                    >
                                                        <Check className="h-4 w-4 text-white" />
                                                    </motion.div>
                                                )}
                                            </motion.button>

                                            <motion.button
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 }}
                                                onClick={() => setLoadDemo(false)}
                                                className={cn(
                                                    'w-full flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 text-left',
                                                    !loadDemo
                                                        ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/8'
                                                )}
                                            >
                                                <div className={cn(
                                                    'w-12 h-12 rounded-xl flex items-center justify-center',
                                                    !loadDemo ? 'bg-emerald-500/20' : 'bg-white/5'
                                                )}>
                                                    <Rocket className={cn(
                                                        'h-6 w-6',
                                                        !loadDemo ? 'text-emerald-400' : 'text-white/50'
                                                    )} />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className={cn(
                                                        'font-semibold',
                                                        !loadDemo ? 'text-emerald-300' : 'text-white'
                                                    )}>
                                                        Empezar desde cero
                                                    </h3>
                                                    <p className="text-xs text-white/50 mt-1">
                                                        Subí tus propios datos y comenzá a analizar
                                                    </p>
                                                </div>
                                                {!loadDemo && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
                                                    >
                                                        <Check className="h-4 w-4 text-white" />
                                                    </motion.div>
                                                )}
                                            </motion.button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation buttons */}
                <div className="flex items-center justify-between mt-6">
                    <Button
                        variant="ghost"
                        onClick={goPrev}
                        disabled={currentStep === 0}
                        className={cn(
                            'text-white/50 hover:text-white hover:bg-white/5',
                            currentStep === 0 && 'invisible'
                        )}
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Anterior
                    </Button>

                    {currentStep < steps.length - 1 ? (
                        <Button
                            onClick={goNext}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                        >
                            Siguiente
                            <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleComplete}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 px-8"
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Comenzar
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}