# Redux Toolkit Setup Guide

## What's Installed

- **@reduxjs/toolkit** - Redux state management with built-in utilities
- **react-redux** - React bindings for Redux
- **RTK Query** - Built-in data fetching library (included with Redux Toolkit)

## Project Structure

```
src/
├── lib/
│   ├── store.ts                    # Redux store configuration
│   ├── hooks.ts                    # Custom hooks (useAppDispatch, useAppSelector)
│   └── slices/
│       ├── apiSlice.ts            # RTK Query API endpoints
│       └── dataSlice.ts           # Example Redux Thunk slice
├── app/
│   ├── providers.tsx              # Redux Provider wrapper
│   └── layout.tsx                 # Updated with Redux Provider
└── components/
    └── example-redux.tsx          # Example usage component
```

## Two Approaches for API Calls

### 1. RTK Query (Recommended for CRUD)
**File:** `src/lib/slices/apiSlice.ts`

Best for:
- Simple GET/POST/PUT/DELETE operations
- Automatic caching & refetching
- Normalized state management
- Less boilerplate code

```typescript
// Using RTK Query hooks in components
const { data, isLoading, error } = useGetDataQuery();
const [createData] = useCreateDataMutation();
```

### 2. Redux Thunk (For Complex Logic)
**File:** `src/lib/slices/dataSlice.ts`

Best for:
- Complex async workflows
- Multiple sequential API calls
- Custom side effects
- Fine-grained control

```typescript
// Using async thunks
const dispatch = useAppDispatch();
dispatch(fetchItems());
const { items, loading, error } = useAppSelector(state => state.data);
```

## How to Use

### 1. Define API Endpoints
Edit `src/lib/slices/apiSlice.ts` to add your endpoints:

```typescript
endpoints: (builder) => ({
  getUsers: builder.query({
    query: () => '/users',
    providesTags: ['User'],
  }),
  createUser: builder.mutation({
    query: (newUser) => ({
      url: '/users',
      method: 'POST',
      body: newUser,
    }),
    invalidatesTags: ['User'],
  }),
}),
```

### 2. Use in Components
```typescript
'use client';

import { useGetUsersQuery, useCreateUserMutation } from '@/lib/slices/apiSlice';

export default function UsersComponent() {
  const { data: users, isLoading } = useGetUsersQuery();
  const [createUser] = useCreateUserMutation();

  return (
    // Your JSX here
  );
}
```

### 3. Environment Configuration
Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 4. Authorization
The `apiSlice` automatically includes Bearer tokens from localStorage:

```typescript
// Set token after login
localStorage.setItem('authToken', 'your-jwt-token');

// Token will be automatically added to all API requests
```

## Managing Store State

### Accessing State
```typescript
const userState = useAppSelector(state => state[apiSlice.reducerPath]);
```

### Creating Custom Slices
If you need additional non-API state:

```typescript
import { createSlice } from '@reduxjs/toolkit';

const mySlice = createSlice({
  name: 'myFeature',
  initialState: { /* ... */ },
  reducers: { /* ... */ },
});

// Add to store.ts
configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    myFeature: mySlice.reducer, // Add here
  },
})
```

## File Modifications Made

1. **package.json** - Added dependencies
2. **src/app/layout.tsx** - Added Redux Provider
3. **src/app/providers.tsx** - Created client-side provider wrapper
4. **src/lib/store.ts** - Redux store configuration
5. **src/lib/hooks.ts** - Custom typed hooks
6. **src/lib/slices/apiSlice.ts** - RTK Query endpoints
7. **src/lib/slices/dataSlice.ts** - Example Redux Thunk slice
8. **src/components/example-redux.tsx** - Example usage component

## Next Steps

1. Update your API endpoints in `apiSlice.ts`
2. Remove or replace the example component in your app
3. Set `NEXT_PUBLIC_API_URL` in `.env.local`
4. Start making API calls using the hooks!
