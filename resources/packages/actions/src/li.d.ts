declare module 'li' {
	const li: {
		parse( linkHeader: string ): Record< string, string >;
		stringify( links: Record< string, string > ): string;
	};
	export default li;
}
