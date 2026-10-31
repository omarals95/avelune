import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Icons are decorative by default: the control around them carries the accessible name,
 * so screen readers never announce private-use glyphs.
 */
export function Icon(props: ComponentProps<typeof MaterialCommunityIcons>) {
  return <MaterialCommunityIcons accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...props} />;
}

/** Icon size tokens. */
export const ICON = { sm: 18, md: 24, lg: 30, xl: 36 };
