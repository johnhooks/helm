import { useState } from 'react';
import { createRegistry, RegistryProvider, useSelect } from '@wordpress/data';
import type { DraftAction, ShipAction } from '@helm/actions';
import {
	store as actionsStore,
	STORE_NAME as actionsStoreName,
} from '@helm/actions';
import {
	reducer as actionsReducer,
	initializeDefaultState as initialActionsState,
} from '@helm/actions/store/reducer';
import * as actionSelectors from '@helm/actions/store/selectors';
import type { Action as ActionsAction } from '@helm/actions/store/types';
import { STORE_NAME as navStoreName } from '@helm/nav';
import {
	reducer as navReducer,
	initializeDefaultState as initialNavState,
} from '@helm/nav/store/reducer';
import * as navSelectors from '@helm/nav/store/selectors';
import { STORE_NAME as shipsStoreName, ShipProvider } from '@helm/ships';
import {
	reducer as shipsReducer,
	initializeDefaultState as initialShipsState,
} from '@helm/ships/store/reducer';
import * as shipsSelectors from '@helm/ships/store/selectors';
import type { StarNode } from '@helm/types';
import { createGraphReadKey } from '@helm/nav/store/utils';
import { renderJumpAction } from '../jump/jump-action';
import { renderScanAction } from '../scan/scan-action';

type ActionKind = 'scan_route' | 'jump';

export interface ActionStoryScenario {
	kind: ActionKind;
	draft?: DraftAction;
	action?: ShipAction;
}

const sol: StarNode = {
	id: 1,
	node_id: 1,
	title: 'Sol',
	catalog_id: 'Sol',
	spectral_class: 'G',
	x: 0,
	y: 0,
	z: 0,
	mass: 1,
	radius: 1,
	node_type: 'star',
};
const tau: StarNode = {
	id: 7,
	node_id: 7,
	title: 'Tau Ceti',
	catalog_id: 'Tau Ceti',
	spectral_class: 'G',
	x: 8,
	y: 0,
	z: 0,
	mass: 1,
	radius: 1,
	node_type: 'star',
};

function makeRegistry({ draft, action }: ActionStoryScenario) {
	const navState = initialNavState();
	navState.stars.byId = { 1: sol, 7: tau };
	navState.graph.edgeNodes = {
		2: { id: 2, type: 'waypoint', x: 4, y: 0, z: 0, created_at: null },
	};
	navState.graph.userEdges = [
		{
			id: 101,
			node_a_id: 1,
			node_b_id: 2,
			distance: 4,
			discovered_at: '2026-10-03T12:00:00Z',
		},
		{
			id: 102,
			node_a_id: 2,
			node_b_id: 7,
			distance: 4,
			discovered_at: '2026-10-03T12:00:00Z',
		},
	];
	navState.graph.paths[createGraphReadKey(1, 7)] = {
		reachable: true,
		direct: false,
		nodeIds: [1, 2, 7],
		edgeIds: [101, 102],
		totalDistance: 8,
		nextNodeId: 2,
	};

	const actionsState = initialActionsState();
	if (draft) {
		actionsState.create.action = draft;
		actionsState.create.isDraft = true;
	}
	if (action) {
		actionsState.actions.byId[action.id] = action;
	}

	const shipsState = initialShipsState();
	shipsState.shipState = {
		id: 42,
		power_mode: 'normal',
		power_full_at: null,
		power_max: 1000,
		shields_full_at: null,
		shields_max: 1000,
		hull_integrity: 100,
		hull_max: 100,
		node_id: 1,
		current_action_id: null,
		created_at: '2026-10-03T12:00:00Z',
		updated_at: '2026-10-03T12:00:00Z',
	};
	shipsState.systems.systems = [];
	return createRegistry({
		[navStoreName]: {
			reducer: navReducer,
			selectors: navSelectors,
			initialState: navState,
		},
		[actionsStoreName]: {
			reducer: actionsReducer,
			selectors: actionSelectors,
			actions: {
				clearDraft: (): ActionsAction => ({ type: 'CLEAR_DRAFT' }),
				createAction: (
					shipId: number,
					type: ActionKind,
					params: DraftAction['params']
				): ActionsAction => ({
					type: 'CREATE_ACTION_FINISHED',
					action: {
						id: 900,
						ship_post_id: shipId,
						type,
						params,
						status: 'pending',
						result: null,
						deferred_until: new Date(
							Date.now() + 300_000
						).toISOString(),
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
				}),
			},
			initialState: actionsState,
		},
		[shipsStoreName]: {
			reducer: shipsReducer,
			selectors: shipsSelectors,
			initialState: shipsState,
		},
	});
}

function ActionFromStore({ kind }: { kind: ActionKind }) {
	const { draft, action } = useSelect(
		(select) => ({
			draft: select(actionsStore).getDraft(kind),
			action: select(actionsStore).getLatestAction(kind),
		}),
		[kind]
	);
	if (!draft && !action) {
		return <p role="status">Draft canceled.</p>;
	}
	return kind === 'scan_route'
		? renderScanAction({
				draft: draft ?? undefined,
				action: action ?? undefined,
		  })
		: renderJumpAction({
				draft: draft ?? undefined,
				action: action ?? undefined,
		  });
}

export function RealActionStory({
	scenario,
}: {
	scenario: ActionStoryScenario;
}) {
	const [registry] = useState(() => makeRegistry(scenario));
	return (
		<RegistryProvider value={registry}>
			<ShipProvider shipId={42}>
				<div style={{ width: 380, maxWidth: 'calc(100vw - 32px)' }}>
					<ActionFromStore kind={scenario.kind} />
				</div>
			</ShipProvider>
		</RegistryProvider>
	);
}
