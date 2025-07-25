export interface Tag {
    Id: string;
    Name: string;
    IsActive: boolean;
}

export interface TagFormProps {
    initial?: Partial<Tag>;
    onSubmit: (data: Partial<Tag>) => void;
    onCancel: () => void;
}
