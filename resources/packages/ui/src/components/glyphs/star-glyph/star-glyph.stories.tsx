import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	StarGlyph,
	SPECTRAL_CLASSES,
	STELLAR_TYPES,
	type SpectralClass,
	type StellarType,
} from './star-glyph';
import { Panel } from '../../panel';
import { TitleBar } from '../../title-bar';
import { StatusBadge } from '../../status-badge';

const meta = {
	title: 'Glyphs/StarGlyph',
	component: StarGlyph,
	parameters: {
		layout: 'centered',
		backgrounds: { default: 'dark' },
	},
	argTypes: {
		spectralClass: {
			control: 'select',
			options: SPECTRAL_CLASSES,
		},
		stellarType: {
			control: 'select',
			options: STELLAR_TYPES,
		},
		size: {
			control: 'inline-radio',
			options: ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
		},
	},
} satisfies Meta<typeof StarGlyph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		spectralClass: 'G',
		stellarType: 'mainSequence',
		size: 'md',
	},
};

/**
 * Spectral classes from hot (O) to cool (M)
 */
export const SpectralClasses: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Panel variant="inset" padding="lg" style={{ minWidth: 500 }}>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns:
						'auto 1fr auto auto auto auto auto auto auto',
					gap: '12px 16px',
					alignItems: 'center',
				}}
			>
				<div
					style={{
						fontSize: 10,
						color: '#666',
						fontFamily: 'Antonio, sans-serif',
						letterSpacing: '0.1em',
					}}
				>
					CLASS
				</div>
				<div
					style={{
						fontSize: 10,
						color: '#666',
						fontFamily: 'Antonio, sans-serif',
						letterSpacing: '0.1em',
					}}
				>
					TEMP
				</div>
				{['XXS', 'XS', 'SM', 'MD', 'LG', 'XL', 'XXL'].map((label) => (
					<div
						key={label}
						style={{
							fontSize: 10,
							color: '#666',
							fontFamily: 'Antonio, sans-serif',
							letterSpacing: '0.1em',
							textAlign: 'center',
						}}
					>
						{label}
					</div>
				))}

				{(
					[
						{ class: 'O', temp: '>30,000K', color: 'Blue' },
						{ class: 'B', temp: '10-30,000K', color: 'Blue-white' },
						{ class: 'A', temp: '7,500-10,000K', color: 'White' },
						{
							class: 'F',
							temp: '6,000-7,500K',
							color: 'Yellow-white',
						},
						{ class: 'G', temp: '5,200-6,000K', color: 'Yellow' },
						{ class: 'K', temp: '3,700-5,200K', color: 'Orange' },
						{ class: 'M', temp: '<3,700K', color: 'Red' },
					] as const
				).map((star) => (
					<>
						<div
							key={`${star.class}-label`}
							style={{
								fontSize: 13,
								color: '#f0e6d2',
								fontFamily: 'Antonio, sans-serif',
								fontWeight: 'bold',
							}}
						>
							{star.class}
						</div>
						<div
							key={`${star.class}-temp`}
							style={{
								fontSize: 10,
								color: '#666',
								fontFamily: 'Antonio, sans-serif',
							}}
						>
							{star.temp}
						</div>
						<StarGlyph
							key={`${star.class}-xxs`}
							spectralClass={star.class}
							size="xxs"
						/>
						<StarGlyph
							key={`${star.class}-xs`}
							spectralClass={star.class}
							size="xs"
						/>
						<StarGlyph
							key={`${star.class}-sm`}
							spectralClass={star.class}
							size="sm"
						/>
						<StarGlyph
							key={`${star.class}-md`}
							spectralClass={star.class}
							size="md"
						/>
						<StarGlyph
							key={`${star.class}-lg`}
							spectralClass={star.class}
							size="lg"
						/>
						<StarGlyph
							key={`${star.class}-xl`}
							spectralClass={star.class}
							size="xl"
						/>
						<StarGlyph
							key={`${star.class}-xxl`}
							spectralClass={star.class}
							size="xxl"
						/>
					</>
				))}
			</div>
		</Panel>
	),
};

/**
 * Exotic stellar types
 */
export const StellarTypes: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Panel variant="inset" padding="lg" style={{ minWidth: 400 }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
				{(
					[
						{
							type: 'mainSequence',
							label: 'Main Sequence',
							desc: 'Normal star',
						},
						{
							type: 'giant',
							label: 'Giant',
							desc: 'Expanded, luminous',
						},
						{
							type: 'whiteDwarf',
							label: 'White Dwarf',
							desc: 'Dead star core',
						},
						{
							type: 'neutron',
							label: 'Neutron Star',
							desc: 'Collapsed core',
						},
						{
							type: 'pulsar',
							label: 'Pulsar',
							desc: 'Rotating neutron star',
						},
						{
							type: 'brownDwarf',
							label: 'Brown Dwarf',
							desc: 'Failed star',
						},
					] as const
				).map((star) => (
					<div
						key={star.type}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 16,
						}}
					>
						<StarGlyph stellarType={star.type} size="lg" />
						<div>
							<div
								style={{
									fontSize: 12,
									color: '#f0e6d2',
									fontFamily: 'Antonio, sans-serif',
									letterSpacing: '0.04em',
								}}
							>
								{star.label}
							</div>
							<div
								style={{
									fontSize: 10,
									color: '#666',
									fontFamily: 'Antonio, sans-serif',
								}}
							>
								{star.desc}
							</div>
						</div>
					</div>
				))}
			</div>
		</Panel>
	),
};

// Map spectral class to typical size for visualization
const spectralSizeMap: Record<
	SpectralClass,
	'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
> = {
	M: 'xs',
	K: 'sm',
	G: 'md',
	F: 'md',
	A: 'lg',
	B: 'xl',
	O: 'xxl',
};

/**
 * Stellar neighborhood with relative sizes
 */
export const StellarNeighborhood: Story = {
	parameters: { controls: { disable: true } },
	render: () => {
		const stars: Array<{
			name: string;
			spectralClass: SpectralClass;
			stellarType: StellarType;
			distance: string;
		}> = [
			{
				name: 'Sol',
				spectralClass: 'G',
				stellarType: 'mainSequence',
				distance: '0 LY',
			},
			{
				name: 'Alpha Centauri A',
				spectralClass: 'G',
				stellarType: 'mainSequence',
				distance: '4.37 LY',
			},
			{
				name: 'Alpha Centauri B',
				spectralClass: 'K',
				stellarType: 'mainSequence',
				distance: '4.37 LY',
			},
			{
				name: 'Proxima Centauri',
				spectralClass: 'M',
				stellarType: 'mainSequence',
				distance: '4.24 LY',
			},
			{
				name: "Barnard's Star",
				spectralClass: 'M',
				stellarType: 'mainSequence',
				distance: '5.96 LY',
			},
			{
				name: 'Sirius A',
				spectralClass: 'A',
				stellarType: 'mainSequence',
				distance: '8.6 LY',
			},
			{
				name: 'Sirius B',
				spectralClass: 'A',
				stellarType: 'whiteDwarf',
				distance: '8.6 LY',
			},
			{
				name: 'Vega',
				spectralClass: 'A',
				stellarType: 'mainSequence',
				distance: '25 LY',
			},
		];

		return (
			<Panel variant="default" padding="lg" style={{ minWidth: 600 }}>
				<TitleBar
					title="Local Stellar Neighborhood"
					subtitle="Within 30 LY"
					tone="gold"
				>
					<StatusBadge tone="info">{`${stars.length} STARS`}</StatusBadge>
				</TitleBar>

				<Panel variant="inset" padding="md">
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-around',
							gap: 8,
							padding: '24px 0',
						}}
					>
						{stars.map((star) => (
							<div
								key={star.name}
								style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									justifyContent: 'center',
									height: 64,
								}}
							>
								<StarGlyph
									spectralClass={star.spectralClass}
									stellarType={star.stellarType}
									size={spectralSizeMap[star.spectralClass]}
								/>
							</div>
						))}
					</div>
				</Panel>

				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(4, 1fr)',
						gap: 8,
						marginTop: 16,
					}}
				>
					{stars.map((star) => (
						<Panel key={star.name} variant="inset" padding="sm">
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 8,
								}}
							>
								<StarGlyph
									spectralClass={star.spectralClass}
									stellarType={star.stellarType}
									size="sm"
								/>
								<div>
									<div
										style={{
											fontSize: 11,
											color: '#f0e6d2',
											fontFamily: 'Antonio, sans-serif',
										}}
									>
										{star.name}
									</div>
									<div
										style={{
											fontSize: 9,
											color: '#666',
											fontFamily: 'Antonio, sans-serif',
										}}
									>
										{star.spectralClass} • {star.distance}
									</div>
								</div>
							</div>
						</Panel>
					))}
				</div>
			</Panel>
		);
	},
};

/**
 * Exotic system with unusual stellar objects
 */
export const ExoticSystem: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Panel
			variant="bordered"
			tone="violet"
			padding="lg"
			style={{ minWidth: 500 }}
		>
			<TitleBar
				title="PSR J0737-3039"
				subtitle="Binary Pulsar System"
				tone="violet"
			>
				<StatusBadge tone="danger">HAZARDOUS</StatusBadge>
			</TitleBar>

			<Panel variant="inset" padding="lg">
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 24,
						padding: '24px 0',
					}}
				>
					<div style={{ textAlign: 'center' }}>
						<StarGlyph stellarType="pulsar" size="xl" />
						<div
							style={{
								fontSize: 10,
								color: '#666',
								fontFamily: 'Antonio, sans-serif',
								marginTop: 8,
							}}
						>
							PULSAR A
						</div>
					</div>
					<div
						style={{
							width: 40,
							borderTop: '1px dashed #666',
						}}
					/>
					<div style={{ textAlign: 'center' }}>
						<StarGlyph stellarType="neutron" size="lg" />
						<div
							style={{
								fontSize: 10,
								color: '#666',
								fontFamily: 'Antonio, sans-serif',
								marginTop: 8,
							}}
						>
							PULSAR B
						</div>
					</div>
				</div>
			</Panel>

			<div
				style={{
					marginTop: 16,
					fontSize: 11,
					color: '#a39a88',
					fontFamily: 'Antonio, sans-serif',
					lineHeight: 1.6,
				}}
			>
				Binary pulsar system. Extreme gravitational effects. Recommended
				approach vector: none. Observation distance: 2+ LY minimum.
			</div>
		</Panel>
	),
};
