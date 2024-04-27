export type Activity = {
  title: string;
  description: string;
  done: boolean;
  image?: string;
  link?: string;
};

export type ActivityObject = {
  [id: string]: Activity;
};

export type Wishlist = {
  activities: ActivityObject;
  movies: ActivityObject;
  music: ActivityObject;
  books: ActivityObject;
  food: ActivityObject;
  dates: ActivityObject;
  other: ActivityObject;
  gifts: ActivityObject;
};
