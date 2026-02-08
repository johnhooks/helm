declare module 'wa-sqlite/src/examples/AccessHandlePoolVFS.js' {
	export class AccessHandlePoolVFS {
		name: string;
		isReady: Promise<void>;
		constructor(directoryPath?: string);
		close(): void;
	}
}
