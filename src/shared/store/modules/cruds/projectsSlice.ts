import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Project } from "../../../@types/Project";
import { api } from "../../../services/api";
import { RootState } from "../../store";
import { BaseResultToSave, saveResult } from "./resultSlice";

export const findAllProjects = createAsyncThunk("app/projects/findAllProjects", async (areaId?: string) => {
    const response = await api.get("/projects", { params: { areaId } });

    console.log(response.data);

    return response.data;
});

interface DeletePeopleFromProject {
    projectId: string;
    personsIds: string[];
}

export const downloadProjectsCsv = createAsyncThunk("app/projects/downloadCsv", async (filter: object) => {
    await api.get(`/projects/csv`, { params: { ...filter }, responseType: "blob" }).then(async (response) => {
        // create file link in browser's memory
        const href = URL.createObjectURL(response.request.response);
        // create "a" HTML element with href to file & click
        const link = document.createElement("a");
        link.href = href;
        link.setAttribute("download", "projects.csv"); //or any other extension
        document.body.appendChild(link);
        link.click();

        // clean up "a" element & remove ObjectURL
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    });

    return;
});

export const deletePeopleFromProject = createAsyncThunk(
    "app/projects/deleteProjectsById",
    async ({ projectId, personsIds }: DeletePeopleFromProject) => {
        await api.delete(`/projects/persons/${projectId}`, { data: { personsIds } });
    },
);

export const deleteProjectsById = createAsyncThunk(
    "app/projects/deleteProjectsById",
    async (ids: Project["id"][], { dispatch }) => {
        await Promise.all(ids.map((id) => api.delete(`/projects/${id}`)));
        dispatch(findAllProjects());
    },
);

export const changeProjectStatus = createAsyncThunk("app/project/changeProjectStatus", async (project: Project) => {
    await api.put<Project>(`/projects/${project.id}`, {
        isFinished: !project.isFinished,
    });
    return { ...project, isFinished: !project.isFinished };
});

type SaveProjectParams = Omit<Partial<Project>, "persons" | "areas"> & {
    persons: { id: string; role: string }[];
    areas: string[];
};
export const saveProject = createAsyncThunk(
    "app/project/saveProject",
    async (payload: SaveProjectParams, { dispatch, getState, rejectWithValue }) => {
        let project = null;
        if (payload.id) {
            const response = await api.put<Project>(`/projects/${payload.id}`, {
                title: payload.title,
                finishDate: payload.finishDate,
                startDate: payload.startDate,
                description: payload.description,
                sponsor: payload.sponsor,
                sponsoredValue: payload.sponsoredValue,
            });
            project = response.data;
        } else {
            console.log(payload);
            const responseProject = await api.post<Project>("/projects", payload);
            project = responseProject.data;
        }

        const projectId = project.id;

        if (payload.persons.length) {
            await api.put(`/projects/persons/${projectId}`, {
                persons: payload.persons,
            });
        }

        if (payload.areas.length) {
            await api.put(`/projects/areas/${projectId}`, {
                areas: payload.areas,
            });
        }

        const pendingResultsToSave = (getState() as RootState).projects.pendingResultsToSave;
        if (pendingResultsToSave.length) {
            const responses = await Promise.all(
                pendingResultsToSave.map((resultToSave) =>
                    dispatch(saveResult({ ...resultToSave, projectId: projectId })),
                ),
            );
            const rejectedResponse = responses.find((thunkResult) => saveResult.rejected.match(thunkResult));
            if (rejectedResponse) return rejectWithValue("Não foi possível salvar um dos resultados");
        }
        dispatch(findAllProjects());
        return project;
    },
);

export const projectSlice = createSlice({
    name: "app/projects",
    initialState: {
        projects: [] as Project[],
        pendingResultsToSave: [] as BaseResultToSave[], // Resultados adicionados a um projeto que possívelmente ainda não foi salvo
    },
    reducers: {
        addResultToSave(state, action: PayloadAction<BaseResultToSave>) {
            state.pendingResultsToSave.push(action.payload);
        },
        resetResulstToSave(state) {
            state.pendingResultsToSave = [];
        },
    },
    extraReducers(builder) {
        builder.addCase(deletePeopleFromProject.fulfilled, (state, action) => {
            state.projects = state.projects.map((project) =>
                project.id === action.meta.arg.projectId
                    ? {
                          ...project,
                          persons: project.persons?.filter((person) => !action.meta.arg.personsIds.includes(person.id)),
                      }
                    : project,
            );
        });
        builder.addCase(findAllProjects.fulfilled, (state, action) => {
            state.projects = action.payload;
        });
        builder.addCase(changeProjectStatus.fulfilled, (state, action) => {
            state.projects = state.projects.map((project) =>
                project.id === action.meta.arg.id ? action.payload : project,
            );
        });
        builder.addCase(saveProject.fulfilled, (state) => {
            if (state.pendingResultsToSave.length) state.pendingResultsToSave = [];
        });
    },
});

export const { addResultToSave, resetResulstToSave } = projectSlice.actions;
export default projectSlice.reducer;
