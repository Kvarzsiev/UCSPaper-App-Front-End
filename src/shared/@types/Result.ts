import { Person } from "./Person";
import { Project } from "./Project";

export interface Result {
    id: string;
    description: string;
    project: Project;
    persons?: Person[];
}
