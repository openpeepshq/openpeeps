export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22'),
	() => import('./nodes/23'),
	() => import('./nodes/24'),
	() => import('./nodes/25'),
	() => import('./nodes/26')
];

export const server_loads = [];

export const dictionary = {
		"/": [2],
		"/docs": [3],
		"/docs/[...3]components/[...1]HTML": [10],
		"/docs/[...3]components/[...3]button": [12],
		"/docs/[...3]components/[...5]column": [14],
		"/docs/[...3]components/[...4]container": [13],
		"/docs/[...3]components/[...7]heading": [16],
		"/docs/[...3]components/[...2]head": [11],
		"/docs/[...3]components/[...8]hr": [17],
		"/docs/[...3]components/[...9]image": [18],
		"/docs/[...3]components/[...10]link": [7],
		"/docs/[...3]components/[...11]preview": [8],
		"/docs/[...3]components/[...6]section": [15],
		"/docs/[...3]components/[...12]text": [9],
		"/docs/[...6]examples/[...1]airbnb-review": [~25],
		"/docs/[...6]examples/[...1]apple-receipt": [~26],
		"/docs/[...2]getting-started/[...1]installation": [5],
		"/docs/[...2]getting-started/[...2]usage": [6],
		"/docs/[...5]integrations/[...5]aws-ses": [24],
		"/docs/[...5]integrations/[...2]nodemailer": [21],
		"/docs/[...5]integrations/[...1]overview": [20],
		"/docs/[...5]integrations/[...4]postmark": [23],
		"/docs/[...5]integrations/[...3]sendgrid": [22],
		"/docs/[...1]overview/[...1]svelte-email": [4],
		"/docs/[...4]utilities/[...1]render": [19]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';