export interface Person {
    id: string;
    email: string;
    name?: string;
    institution?: string;

    created_at: Date;
    updated_at: Date;
}
