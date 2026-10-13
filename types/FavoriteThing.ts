export type FavoriteThing = {
  title: string;
  note?: string;
};

export type FavoriteThingObject = {
  [id: string]: FavoriteThing;
};

export type FavoriteThings = {
  music: FavoriteThingObject;
  snacks: FavoriteThingObject;
  drinks: FavoriteThingObject;
  books: FavoriteThingObject;
  movies: FavoriteThingObject;
  flowers: FavoriteThingObject;
  scents: FavoriteThingObject;
  colors: FavoriteThingObject;
  other: FavoriteThingObject;
};
