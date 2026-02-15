import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlanetGlyph, PLANET_TYPES, type PlanetType } from "./planet-glyph";
import { Panel } from "../../panel";
import { TitleBar } from "../../title-bar";
import { StatusBadge } from "../../status-badge";
import { Readout } from "../../readout";
import { BarIndicator } from "../../bar-indicator";

const meta = {
	title: "Glyphs/PlanetGlyph",
	component: PlanetGlyph,
	parameters: {
		layout: "centered",
		backgrounds: { default: "dark" },
	},
	argTypes: {
		type: {
			control: "select",
			options: PLANET_TYPES,
		},
		ringed: { control: "boolean" },
		size: {
			control: "inline-radio",
			options: ["xxs", "xs", "sm", "md", "lg", "xl", "xxl"],
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof PlanetGlyph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		type: "terrestrial",
		size: "md",
	},
};

/**
 * All planet types at each size
 */
export const AllTypes: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Panel variant="inset" padding="lg" style={{ minWidth: 600 }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr auto auto auto auto auto auto auto",
					gap: "12px 16px",
					alignItems: "center",
				}}
			>
				{["TYPE", "XXS", "XS", "SM", "MD", "LG", "XL", "XXL"].map((label) => (
					<div
						key={label}
						style={{
							fontSize: 10,
							color: "#666",
							fontFamily: "Antonio, sans-serif",
							letterSpacing: "0.1em",
							textAlign: label === "TYPE" ? "left" : "center",
						}}
					>
						{label}
					</div>
				))}

				{PLANET_TYPES.map((type) => (
					<>
						<div
							key={`${type}-label`}
							style={{
								fontSize: 11,
								color: "#a39a88",
								fontFamily: "Antonio, sans-serif",
								letterSpacing: "0.06em",
								textTransform: "uppercase",
							}}
						>
							{type.replace(/([A-Z])/g, " $1").trim()}
						</div>
						<PlanetGlyph key={`${type}-xxs`} type={type} size="xxs" />
						<PlanetGlyph key={`${type}-xs`} type={type} size="xs" />
						<PlanetGlyph key={`${type}-sm`} type={type} size="sm" />
						<PlanetGlyph key={`${type}-md`} type={type} size="md" />
						<PlanetGlyph key={`${type}-lg`} type={type} size="lg" />
						<PlanetGlyph key={`${type}-xl`} type={type} size="xl" />
						<PlanetGlyph key={`${type}-xxl`} type={type} size="xxl" />
					</>
				))}
			</div>
		</Panel>
	),
};

/**
 * Planet glyph as part of a survey readout row
 */
export const SurveyRow: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Panel variant="default" padding="lg" style={{ minWidth: 500 }}>
			<TitleBar title="Survey Results" subtitle="Tau Ceti System" tone="gold">
				<StatusBadge tone="success">COMPLETE</StatusBadge>
			</TitleBar>

			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				{(
					[
						{ type: "gasGiant", name: "Tau Ceti I", survey: 100, status: "surveyed" },
						{ type: "terrestrial", name: "Tau Ceti II", survey: 100, status: "habitable" },
						{ type: "iceGiant", name: "Tau Ceti III", survey: 67, status: "scanning" },
						{ type: "dwarf", name: "Tau Ceti IV", survey: 0, status: "unknown" },
					] as const
				).map((planet) => (
					<Panel key={planet.name} variant="inset" padding="sm">
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "auto 1fr auto auto",
								gap: 16,
								alignItems: "center",
							}}
						>
							<PlanetGlyph type={planet.type} size="md" />
							<div>
								<div
									style={{
										fontSize: 13,
										color: "#f0e6d2",
										fontFamily: "Antonio, sans-serif",
										letterSpacing: "0.04em",
									}}
								>
									{planet.name}
								</div>
								<div
									style={{
										fontSize: 10,
										color: "#666",
										fontFamily: "Antonio, sans-serif",
										letterSpacing: "0.08em",
										textTransform: "uppercase",
									}}
								>
									{planet.type.replace(/([A-Z])/g, " $1").trim()}
								</div>
							</div>
							<BarIndicator
								level={planet.survey}
								size="sm"
								// eslint-disable-next-line no-nested-ternary
								tone={planet.survey === 100 ? "success" : planet.survey > 0 ? "gold" : "muted"}
								style={{ width: 60 }}
							/>
							<StatusBadge
								tone={
									({ habitable: "success", surveyed: "accent", scanning: "info" } as Record<string, "success" | "accent" | "info">)[planet.status] ?? "muted"
								}
								pulse={planet.status === "scanning"}
								size="sm"
							>
								{planet.status.toUpperCase()}
							</StatusBadge>
						</div>
					</Panel>
				))}
			</div>
		</Panel>
	),
};

/**
 * Planet detail card showing glyph with full stats
 */
export const PlanetCard: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Panel variant="bordered" tone="gold" padding="lg" style={{ minWidth: 320 }}>
			<div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
				<PlanetGlyph type="terrestrial" size="lg" />
				<div style={{ flex: 1 }}>
					<TitleBar title="Kepler-442b" tone="gold" style={{ marginBottom: 4 }}>
						<StatusBadge tone="success" size="sm">
							HABITABLE
						</StatusBadge>
					</TitleBar>
					<div
						style={{
							fontSize: 10,
							color: "#666",
							fontFamily: "Antonio, sans-serif",
							letterSpacing: "0.08em",
							marginBottom: 16,
						}}
					>
						SUPER EARTH • KEPLER-442 SYSTEM
					</div>
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
				<Readout label="Mass" value="2.3" unit="M⊕" tone="gold" size="sm" />
				<Readout label="Radius" value="1.34" unit="R⊕" tone="gold" size="sm" />
				<Readout label="Temp" value="233" unit="K" tone="gold" size="sm" />
				<Readout label="Orbit" value="112.3" unit="d" tone="gold" size="sm" />
			</div>

			<div style={{ marginTop: 16 }}>
				<div
					style={{
						fontSize: 10,
						color: "#666",
						fontFamily: "Antonio, sans-serif",
						letterSpacing: "0.08em",
						marginBottom: 8,
					}}
				>
					SURVEY PROGRESS
				</div>
				<BarIndicator level={78} size="md" tone="gold" />
			</div>
		</Panel>
	),
};

// Map planet types to relative sizes
const planetSizeMap: Record<PlanetType, "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl"> = {
	dwarf: "xxs",
	frozen: "xs",
	molten: "sm",
	terrestrial: "sm",
	desert: "sm",
	ocean: "md",
	toxic: "md",
	superEarth: "md",
	iceGiant: "lg",
	hotJupiter: "xl",
	gasGiant: "xxl",
};

/**
 * System overview showing all planets with relative sizes
 */
export const SystemOverview: Story = {
	parameters: { controls: { disable: true } },
	render: () => {
		const planets: Array<{ type: PlanetType; name: string; distance: string }> = [
			{ type: "molten", name: "Alpha I", distance: "0.4 AU" },
			{ type: "terrestrial", name: "Alpha II", distance: "1.0 AU" },
			{ type: "superEarth", name: "Alpha III", distance: "1.5 AU" },
			{ type: "gasGiant", name: "Alpha IV", distance: "5.2 AU" },
			{ type: "hotJupiter", name: "Alpha V", distance: "9.5 AU" },
			{ type: "iceGiant", name: "Alpha VI", distance: "19.2 AU" },
			{ type: "dwarf", name: "Alpha VII", distance: "30.1 AU" },
			{ type: "frozen", name: "Alpha VIII", distance: "39.5 AU" },
		];

		return (
			<Panel variant="default" padding="lg" style={{ minWidth: 650 }}>
				<TitleBar title="Alpha Centauri A" subtitle="System Survey" tone="sky">
					<StatusBadge tone="info">8 BODIES</StatusBadge>
				</TitleBar>

				<Panel variant="inset" padding="md">
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-around",
							gap: 12,
							padding: "20px 0",
						}}
					>
						{/* Star */}
						<div
							style={{
								width: 48,
								height: 48,
								borderRadius: "50%",
								background: "#fff4ea",
								boxShadow: "0 0 24px #fff4ea",
								flexShrink: 0,
							}}
						/>

						{/* Planets in order with relative sizes */}
						{planets.map((planet) => (
							<div
								key={planet.name}
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									height: 48,
								}}
							>
								<PlanetGlyph type={planet.type} size={planetSizeMap[planet.type]} />
							</div>
						))}
					</div>
				</Panel>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(4, 1fr)",
						gap: 8,
						marginTop: 16,
					}}
				>
					{planets.map((planet) => (
						<Panel key={planet.name} variant="inset" padding="sm">
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 8,
								}}
							>
								<PlanetGlyph type={planet.type} size="sm" />
								<div>
									<div
										style={{
											fontSize: 11,
											color: "#f0e6d2",
											fontFamily: "Antonio, sans-serif",
										}}
									>
										{planet.name}
									</div>
									<div
										style={{
											fontSize: 9,
											color: "#666",
											fontFamily: "Antonio, sans-serif",
										}}
									>
										{planet.distance}
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
