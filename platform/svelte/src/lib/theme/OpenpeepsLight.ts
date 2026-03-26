import type { CustomThemeConfig } from '@skeletonlabs/tw-plugin';

export const OpenpeepsLight: CustomThemeConfig = {
	name: 'OpenpeepsLight',
	properties: {
		// =~= Theme Properties =~=
		'--theme-font-family-base': `system-ui`,
		'--theme-font-family-heading': `system-ui`,
		'--theme-font-color-base': 'var(--color-surface-900)',
		'--theme-font-color-dark': 'var(--color-primary-50)',
		'--theme-rounded-base': '9999px',
		'--theme-rounded-container': '8px',
		'--theme-border-base': '1px',
		// =~= Theme On-X Colors =~=
		'--on-primary': '255 255 255',
		'--on-secondary': '0 0 0',
		'--on-tertiary': '255 255 255',
		'--on-success': '0 0 0',
		'--on-warning': '0 0 0',
		'--on-error': '255 255 255',
		'--on-surface': '255 255 255',
		// =~= Theme Colors  =~=
		// primary | #0C889D
		'--color-primary-50': '219 237 240', // #dbedf0
		'--color-primary-100': '206 231 235', // #cee7eb
		'--color-primary-200': '194 225 231', // #c2e1e7
		'--color-primary-300': '158 207 216', // #9ecfd8
		'--color-primary-400': '85 172 186', // #55acba
		'--color-primary-500': '12 136 157', // #0C889D
		'--color-primary-600': '11 122 141', // #0b7a8d
		'--color-primary-700': '9 102 118', // #096676
		'--color-primary-800': '7 82 94', // #07525e
		'--color-primary-900': '6 67 77', // #06434d
		// secondary | #31B28B
		'--color-secondary-50': '224 243 238', // #e0f3ee
		'--color-secondary-100': '214 240 232', // #d6f0e8
		'--color-secondary-200': '204 236 226', // #ccece2
		'--color-secondary-300': '173 224 209', // #ade0d1
		'--color-secondary-400': '111 201 174', // #6fc9ae
		'--color-secondary-500': '49 178 139', // #31B28B
		'--color-secondary-600': '44 160 125', // #2ca07d
		'--color-secondary-700': '37 134 104', // #258668
		'--color-secondary-800': '29 107 83', // #1d6b53
		'--color-secondary-900': '24 87 68', // #185744
		// tertiary | #320E3B
		'--color-tertiary-50': '224 219 226', // #e0dbe2
		'--color-tertiary-100': '214 207 216', // #d6cfd8
		'--color-tertiary-200': '204 195 206', // #ccc3ce
		'--color-tertiary-300': '173 159 177', // #ad9fb1
		'--color-tertiary-400': '112 86 118', // #705676
		'--color-tertiary-500': '50 14 59', // #320E3B
		'--color-tertiary-600': '45 13 53', // #2d0d35
		'--color-tertiary-700': '38 11 44', // #260b2c
		'--color-tertiary-800': '30 8 35', // #1e0823
		'--color-tertiary-900': '25 7 29', // #19071d
		// success | #84cc16
		'--color-success-50': '237 247 220', // #edf7dc
		'--color-success-100': '230 245 208', // #e6f5d0
		'--color-success-200': '224 242 197', // #e0f2c5
		'--color-success-300': '206 235 162', // #ceeba2
		'--color-success-400': '169 219 92', // #a9db5c
		'--color-success-500': '132 204 22', // #84cc16
		'--color-success-600': '119 184 20', // #77b814
		'--color-success-700': '99 153 17', // #639911
		'--color-success-800': '79 122 13', // #4f7a0d
		'--color-success-900': '65 100 11', // #41640b
		// warning | #FFDF64
		'--color-warning-50': '255 250 232', // #fffae8
		'--color-warning-100': '255 249 224', // #fff9e0
		'--color-warning-200': '255 247 216', // #fff7d8
		'--color-warning-300': '255 242 193', // #fff2c1
		'--color-warning-400': '255 233 147', // #ffe993
		'--color-warning-500': '255 223 100', // #FFDF64
		'--color-warning-600': '230 201 90', // #e6c95a
		'--color-warning-700': '191 167 75', // #bfa74b
		'--color-warning-800': '153 134 60', // #99863c
		'--color-warning-900': '125 109 49', // #7d6d31
		// error | #A30000
		'--color-error-50': '241 217 217', // #f1d9d9
		'--color-error-100': '237 204 204', // #edcccc
		'--color-error-200': '232 191 191', // #e8bfbf
		'--color-error-300': '218 153 153', // #da9999
		'--color-error-400': '191 77 77', // #bf4d4d
		'--color-error-500': '163 0 0', // #A30000
		'--color-error-600': '147 0 0', // #930000
		'--color-error-700': '122 0 0', // #7a0000
		'--color-error-800': '98 0 0', // #620000
		'--color-error-900': '80 0 0', // #500000
		// surface | #25292C
		'--color-surface-50': '255 255 255', // #ffffff
		'--color-surface-100': '237 239 240', // #edeff0
		'--color-surface-200': '233 235 236', // #e9ebec
		'--color-surface-300': '219 223 225', // #dbdfe1
		'--color-surface-400': '193 198 203', // #c1c6cb
		'--color-surface-500': '37 41 44', // #25292C
		'--color-surface-600': '33 37 40', // #212528
		'--color-surface-700': '28 31 33', // #1c1f21
		'--color-surface-800': '22 25 26', // #16191a
		'--color-surface-900': '18 20 22' // #121416
	}
};
