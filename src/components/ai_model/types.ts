
export type ProviderEnum = "Chat-GPT" | "Gemini" | "Claude" | "Groq";

export interface AIModel {
    Id: string;
    Name: string;
    Description?: string;
    ModelName: string;
    ContextWindowSize: number;
    Provider: ProviderEnum;
    IsActive: boolean;
    // Optionally add CreatedAt, UpdatedAt, IsDeleted if needed
}

export interface AIModelFormProps {
    initial?: Partial<AIModel>;
    onSubmit: (data: Partial<AIModel>) => void;
    onCancel: () => void;
}
