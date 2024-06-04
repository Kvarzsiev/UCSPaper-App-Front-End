import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../../services/api";
import { Area } from "../../../@types/Area";

export const findAllAreas = createAsyncThunk("app/areas/findAllAreas", async () => {
    const response = await api.get("/areas");
    return response.data;
});

export const areaSlice = createSlice({
    name: "app/areas",
    initialState: {
        areas: [] as Area[],
    },
    reducers: {
        // actionQualquer(state, action: PayloadAction) {},
    },
    extraReducers(builder) {
        builder.addCase(findAllAreas.fulfilled, (state, action) => {
            state.areas = action.payload;
        });
        // builder.addCase(savePerson.fulfilled, (state, action) => {
        //     if (action.meta.arg.id) {
        //         state.persons = state.persons.map((p) => (p.id === action.meta.arg.id ? action.payload : p));
        //     } else {
        //         state.persons.push(action.payload);
        //     }
        // });
        // builder.addMatcher(isAnyOf(,), (state, action) => {});
    },
});

export default areaSlice.reducer;
