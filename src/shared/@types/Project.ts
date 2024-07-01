import { Area } from "./Area";
import { Person } from "./Person";
import { Result } from "./Result";

export type Roles = "coordinator" | "member";

export interface Project {
    id: string;
    title: string;
    description?: string;
    sponsor?: string;
    sponsoredValue?: string;
    startDate: Date | null;
    finishDate: Date | null;
    isFinished: boolean;

    persons?: (Person & { role: Roles })[];
    results: Result[];
    areas: Area[];

    created_at: Date;
    updated_at: Date;
}
