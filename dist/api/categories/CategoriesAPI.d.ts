import { GraphQLClient } from '../../client/graphql';
import { TransactionCategory, CategoryGroup, TransactionTag, CreateCategoryInput, UpdateCategoryInput, CreateTagInput, BulkDeleteResult } from '../../types';
export interface CategoriesAPI {
    getCategories(): Promise<TransactionCategory[]>;
    getCategoryById(categoryId: string): Promise<TransactionCategory>;
    createCategory(data: CreateCategoryInput): Promise<TransactionCategory>;
    updateCategory(categoryId: string, data: UpdateCategoryInput): Promise<TransactionCategory>;
    deleteCategory(categoryId: string): Promise<boolean>;
    deleteCategories(categoryIds: string[]): Promise<BulkDeleteResult>;
    getCategoryGroups(): Promise<CategoryGroup[]>;
    getCategoryGroupById(groupId: string): Promise<CategoryGroup>;
    getTags(): Promise<TransactionTag[]>;
    getTagById(tagId: string): Promise<TransactionTag>;
    createTag(data: CreateTagInput): Promise<TransactionTag>;
    updateTag(tagId: string, data: Partial<CreateTagInput>): Promise<TransactionTag>;
    deleteTag(tagId: string): Promise<boolean>;
    setTransactionTags(transactionId: string, tagIds: string[]): Promise<boolean>;
    addTagToTransaction(transactionId: string, tagId: string): Promise<boolean>;
    removeTagFromTransaction(transactionId: string, tagId: string): Promise<boolean>;
}
export declare class CategoriesAPIImpl implements CategoriesAPI {
    private graphql;
    constructor(graphql: GraphQLClient);
    getCategories(): Promise<TransactionCategory[]>;
    getCategoryById(categoryId: string): Promise<TransactionCategory>;
    createCategory(data: CreateCategoryInput): Promise<TransactionCategory>;
    updateCategory(categoryId: string, data: UpdateCategoryInput): Promise<TransactionCategory>;
    deleteCategory(categoryId: string): Promise<boolean>;
    deleteCategories(categoryIds: string[]): Promise<BulkDeleteResult>;
    getCategoryGroups(): Promise<CategoryGroup[]>;
    getCategoryGroupById(groupId: string): Promise<CategoryGroup>;
    getTags(): Promise<TransactionTag[]>;
    getTagById(tagId: string): Promise<TransactionTag>;
    createTag(data: CreateTagInput): Promise<TransactionTag>;
    updateTag(tagId: string, data: Partial<CreateTagInput>): Promise<TransactionTag>;
    deleteTag(tagId: string): Promise<boolean>;
    setTransactionTags(transactionId: string, tagIds: string[]): Promise<boolean>;
    addTagToTransaction(transactionId: string, tagId: string): Promise<boolean>;
    removeTagFromTransaction(transactionId: string, tagId: string): Promise<boolean>;
}
//# sourceMappingURL=CategoriesAPI.d.ts.map