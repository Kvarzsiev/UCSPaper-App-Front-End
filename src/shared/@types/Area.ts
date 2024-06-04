import { Project } from "./Project";

export interface Area {
    id: string;
    name: string;
    cnpqCode?: string;
    hierarchy: string;

    projects: Project[];

    created_at: Date;
    updated_at: Date;
}
