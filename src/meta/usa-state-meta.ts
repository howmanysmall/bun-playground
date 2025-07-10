import UsaRegion from "./usa-region";
import UsaState from "./usa-state";

export interface UsaStateMetadata {
	readonly usaRegion: UsaRegion;
}

export const UsaStateMeta: Record<UsaState, UsaStateMetadata> = {
	[UsaState.Alabama]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Alaska]: {
		usaRegion: UsaRegion.West,
	},
	[UsaState.Arizona]: {
		usaRegion: UsaRegion.West,
	},
	[UsaState.Arkansas]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.California]: {
		usaRegion: UsaRegion.West,
	},
	[UsaState.Colorado]: {
		usaRegion: UsaRegion.West,
	},
	[UsaState.Connecticut]: {
		usaRegion: UsaRegion.Northeast,
	},
	[UsaState.Delaware]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Florida]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Georgia]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Hawaii]: {
		usaRegion: UsaRegion.West,
	},
	[UsaState.Idaho]: {
		usaRegion: UsaRegion.West,
	},
	[UsaState.Illinois]: {
		usaRegion: UsaRegion.Midwest,
	},
	[UsaState.Indiana]: {
		usaRegion: UsaRegion.Midwest,
	},
	[UsaState.Iowa]: {
		usaRegion: UsaRegion.Midwest,
	},
	[UsaState.Kansas]: {
		usaRegion: UsaRegion.Midwest,
	},
	[UsaState.Kentucky]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Louisiana]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Maine]: {
		usaRegion: UsaRegion.Northeast,
	},
	[UsaState.Maryland]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Massachusetts]: {
		usaRegion: UsaRegion.Northeast,
	},
	[UsaState.Michigan]: {
		usaRegion: UsaRegion.Midwest,
	},
	[UsaState.Minnesota]: {
		usaRegion: UsaRegion.Midwest,
	},
	[UsaState.Mississippi]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Missouri]: {
		usaRegion: UsaRegion.Midwest,
	},
	[UsaState.Montana]: {
		usaRegion: UsaRegion.West,
	},
	[UsaState.Nebraska]: {
		usaRegion: UsaRegion.Midwest,
	},
	[UsaState.Nevada]: {
		usaRegion: UsaRegion.West,
	},
	[UsaState.NewHampshire]: {
		usaRegion: UsaRegion.Northeast,
	},
	[UsaState.NewJersey]: {
		usaRegion: UsaRegion.Northeast,
	},
	[UsaState.NewMexico]: {
		usaRegion: UsaRegion.West,
	},
	[UsaState.NewYork]: {
		usaRegion: UsaRegion.Northeast,
	},
	[UsaState.NorthCarolina]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.NorthDakota]: {
		usaRegion: UsaRegion.Midwest,
	},
	[UsaState.Ohio]: {
		usaRegion: UsaRegion.Midwest,
	},
	[UsaState.Oklahoma]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Oregon]: {
		usaRegion: UsaRegion.West,
	},
	[UsaState.Pennsylvania]: {
		usaRegion: UsaRegion.Northeast,
	},
	[UsaState.RhodeIsland]: {
		usaRegion: UsaRegion.Northeast,
	},
	[UsaState.SouthCarolina]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.SouthDakota]: {
		usaRegion: UsaRegion.Midwest,
	},
	[UsaState.Tennessee]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Texas]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Utah]: {
		usaRegion: UsaRegion.West,
	},
	[UsaState.Vermont]: {
		usaRegion: UsaRegion.Northeast,
	},
	[UsaState.Virginia]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Washington]: {
		usaRegion: UsaRegion.West,
	},
	[UsaState.WashingtonDc]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.WestVirginia]: {
		usaRegion: UsaRegion.South,
	},
	[UsaState.Wisconsin]: {
		usaRegion: UsaRegion.Midwest,
	},
	[UsaState.Wyoming]: {
		usaRegion: UsaRegion.West,
	},
};
export default UsaStateMeta;
