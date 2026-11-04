export type TeeId = "white" | "yellow" | "blue";

export type Course = {
  club: string;
  course: string;
  location: string;
  par: number;
  tees: {
    id: TeeId;
    name: string;
    courseRating: number | null;
    slopeRating: number | null;
    yardsTotal: number;
    default: boolean;
  }[];
  holes: {
    number: number;
    par: number;
    strokeIndex: number;
    yards: { white: number; yellow: number; blue: number };
  }[];
};

export type HoleScore = {
  hole: number;
  par: number;
  strokeIndex: number;
  yards: number;
  strokes: number | null;
  pickedUp: boolean;
  putts: number | null;
  fir: string | null;
  gir: boolean | null;
  strokesReceived: number;
  net: number | null;
  points: number;
  vsPar: number | null;
};

export type Player = {
  id: number;
  name: string;
};

export type RoundDetail = {
  id: number;
  playerId: number;
  playedOn: string;
  tee: TeeId;
  format: string;
  handicapIndex: number;
  playingHandicap: number;
  notes: string | null;
  gross: number | null;
  vsPar: number | null;
  points: number;
  holesCompleted: number;
  pickedUpCount: number;
  front9Gross: number | null;
  back9Gross: number | null;
  holes: HoleScore[];
};

export type RoundSummary = {
  id: number;
  playerId: number;
  playedOn: string;
  tee: TeeId;
  format: string;
  handicapIndex: number;
  playingHandicap: number;
  gross: number | null;
  vsPar: number | null;
  points: number;
  holesCompleted: number;
  playedGross: number;
  playedVsPar: number;
  pickedUpCount: number;
};

export type HoleStats = {
  number: number;
  par: number;
  strokeIndex: number;
  yardsWhite: number;
  yardsYellow: number;
  yardsBlue: number;
  played: number;
  completed: number;
  pickups: number;
  avgGross: number | null;
  best: number | null;
  worst: number | null;
  avgPoints: number | null;
  avgVsPar: number | null;
  birdiesOrBetter: number;
  pars: number;
  bogeys: number;
  doublesPlus: number;
  firAttempts: number;
  firHits: number;
  girAttempts: number;
  girHits: number;
  avgPutts: number | null;
  strategy: string;
};

export type Stats = {
  roundCount: number;
  completeGrossCount: number;
  avgGross: number | null;
  bestGross: number | null;
  worstGross: number | null;
  avgPoints: number | null;
  bestPoints: number | null;
  avgFront9: number | null;
  avgBack9: number | null;
  lastRound: RoundSummary | null;
  holes: HoleStats[];
  problemHoles: number[];
  scoringHoles: number[];
};

export type HoleHistoryPoint = {
  roundId: number;
  playedOn: string;
  tee: TeeId;
  strokes: number;
  vsPar: number;
  points: number;
};

export type Defaults = {
  handicapIndex: number | null;
  playingHandicap: number;
  tee: TeeId;
  format: string;
};

export type HoleIn = {
  hole: number;
  strokes: number | null;
  pickedUp: boolean;
  putts: number | null;
  fir: string | null;
  gir: boolean | null;
};

export type RoundIn = {
  playerId: number;
  playedOn: string;
  tee: TeeId;
  format: string;
  handicapIndex: number;
  playingHandicap: number;
  notes: string | null;
  holes: HoleIn[];
};
