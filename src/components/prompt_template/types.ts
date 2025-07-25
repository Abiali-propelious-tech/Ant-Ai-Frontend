export interface PromptTemplate {
    Id: string;
    Name: string;
    PromptTagsId: string;
    Prompt: string;
    Description?: string;
    SingleModelList?: string[];
    BatchModelList?: string[];
    CreatedAt: string;
    UpdatedAt: string;
    IsDeleted: boolean;
    IsActive: boolean;
}

export interface PromptTemplateFormProps {
    initial?: Partial<PromptTemplate>;
    tagOptions: { value: string; label: string }[];
    modelOptions: { value: string; label: string }[];
    onSubmit: (data: Partial<PromptTemplate>) => void;
    onCancel: () => void;
}
