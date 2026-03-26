export interface LocalJamSettings {
	defaults: {
		video: boolean;
		audio: boolean;
		screenShare: boolean;
		speaker?: boolean;
	};
	deviceIds: {
		camera?: string;
		microphone?: string;
		speaker?: string;
		screenShare?: string;
	};
}

export interface MediaPermissions {
	camera: boolean;
	microphone: boolean;
	speaker:boolean,
	lastDenied?: {
		camera?: boolean;
		microphone?: boolean;
		speaker?:boolean,
	};
}
