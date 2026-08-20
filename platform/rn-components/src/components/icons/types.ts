import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react-native';

export type LucideIcon = ComponentType<LucideProps> & { className?: string };
