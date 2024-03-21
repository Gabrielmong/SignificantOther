import { configureStore } from '@reduxjs/toolkit';
import { UserReducer, RoomReducer } from './slices';

export const store = configureStore({
  reducer: {
    user: UserReducer,
    room: RoomReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
