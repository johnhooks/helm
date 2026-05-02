export type ResolutionStatus = 'IDLE' | 'RESOLVING' | 'SUCCESS' | 'ERROR';

export interface Resolvable<Data> {
	data: Data;
	status: ResolutionStatus;
	isResolving: boolean;
	hasResolved: boolean;
}
