import { validateRequired, logger } from '../../utils';
export class CategoriesAPIImpl {
    constructor(graphql) {
        this.graphql = graphql;
    }
    // Category management methods
    async getCategories() {
        logger.debug('Fetching all transaction categories');
        // FIXED: Use exact working query from MonarchMoney web app
        const query = `
      query GetCategories {
        categories {
          ...CategoryFields
          __typename
        }
      }

      fragment CategoryFields on Category {
        id
        order
        name
        icon
        systemCategory
        isSystemCategory
        isDisabled
        group {
          id
          name
          type
          __typename
        }
        __typename
      }
    `;
        const result = await this.graphql.query(query);
        logger.debug(`Retrieved ${result.categories.length} categories using web app schema`);
        return result.categories || [];
    }
    async getCategoryById(categoryId) {
        validateRequired({ categoryId });
        logger.debug(`Fetching category by ID: ${categoryId}`);
        const query = `
      query GetTransactionCategory($categoryId: ID!) {
        transactionCategory(id: $categoryId) {
          id
          name
          displayName
          shortName
          color
          icon
          order
          isDefault
          isDisabled
          isSystemCategory
          groupId
          group {
            id
            name
            displayName
            color
            icon
            order
          }
          parentCategoryId
          parentCategory {
            id
            name
            displayName
          }
          childCategories {
            id
            name
            displayName
            color
            icon
          }
          createdAt
          updatedAt
        }
      }
    `;
        const result = await this.graphql.query(query, { categoryId });
        if (!result.transactionCategory) {
            throw new Error(`Category not found: ${categoryId}`);
        }
        return result.transactionCategory;
    }
    async createCategory(data) {
        validateRequired({ name: data.name });
        logger.debug(`Creating transaction category: ${data.name}`);
        // Use exact mutation from Monarch web app (captured 2026-02-04)
        // Old mutation name CreateTransactionCategory with CreateTransactionCategoryInput doesn't exist in API
        const mutation = `
      mutation Web_CreateCategory($input: CreateCategoryInput!) {
        createCategory(input: $input) {
          errors {
            ...PayloadErrorFields
            __typename
          }
          category {
            id
            ...CategoryFormFields
            __typename
          }
          __typename
        }
      }

      fragment PayloadErrorFields on PayloadError {
        fieldErrors {
          field
          messages
          __typename
        }
        message
        code
        __typename
      }

      fragment CategoryFormFields on Category {
        id
        order
        name
        icon
        systemCategory
        systemCategoryDisplayName
        budgetVariability
        excludeFromBudget
        isSystemCategory
        isDisabled
        isProtected
        group {
          id
          type
          groupLevelBudgetingEnabled
          __typename
        }
        rolloverPeriod {
          id
          startMonth
          startingBalance
          type
          frequency
          targetAmount
          __typename
        }
        __typename
      }
    `;
        // Build input matching web app format:
        // - 'group' is group ID (string), not 'groupId'
        // - includes budgetVariability, excludeFromBudget, rollover settings
        const input = {
            name: data.name,
            icon: data.icon || '❓',
            group: data.groupId || data.group,
            excludeFromBudget: data.excludeFromBudget || false,
            budgetVariability: data.budgetVariability || 'flexible',
            rolloverEnabled: data.rolloverEnabled || false,
            rolloverStartMonth: data.rolloverStartMonth || new Date().toISOString().slice(0, 7) + '-01',
            rolloverStartingBalance: data.rolloverStartingBalance || 0,
            rolloverFrequency: data.rolloverFrequency || 'monthly',
        };
        const result = await this.graphql.mutation(mutation, { input });
        if (result.createCategory.errors) {
            const errors = result.createCategory.errors;
            const messages = [];
            if (errors.message)
                messages.push(errors.message);
            if (errors.fieldErrors) {
                for (const fe of errors.fieldErrors) {
                    messages.push(`${fe.field}: ${fe.messages.join(', ')}`);
                }
            }
            if (messages.length > 0) {
                throw new Error(`Failed to create category: ${messages.join('; ')}`);
            }
        }
        return result.createCategory.category;
    }
    async updateCategory(categoryId, data) {
        validateRequired({ categoryId });
        logger.debug(`Updating category: ${categoryId}`);
        const mutation = `
      mutation UpdateTransactionCategory($categoryId: ID!, $input: UpdateTransactionCategoryInput!) {
        updateTransactionCategory(id: $categoryId, input: $input) {
          category {
            id
            name
            displayName
            shortName
            color
            icon
            order
            isDefault
            isDisabled
            isSystemCategory
            groupId
            parentCategoryId
            createdAt
            updatedAt
          }
          errors {
            field
            message
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { categoryId, input: data });
        if (result.updateTransactionCategory.errors?.length > 0) {
            const errorMessages = result.updateTransactionCategory.errors.map(e => e.message).join(', ');
            throw new Error(`Failed to update category: ${errorMessages}`);
        }
        return result.updateTransactionCategory.category;
    }
    async deleteCategory(categoryId, moveToCategoryId) {
        validateRequired({ categoryId });
        logger.debug(`Deleting category: ${categoryId}`);
        // Use exact mutation from Monarch web app (captured 2026-02-04)
        // Old mutation name DeleteTransactionCategory doesn't exist in API
        const mutation = `
      mutation Web_DeleteCategory($id: UUID!, $moveToCategoryId: UUID) {
        deleteCategory(id: $id, moveToCategoryId: $moveToCategoryId) {
          errors {
            ...PayloadErrorFields
            __typename
          }
          deleted
          __typename
        }
      }

      fragment PayloadErrorFields on PayloadError {
        fieldErrors {
          field
          messages
          __typename
        }
        message
        code
        __typename
      }
    `;
        const variables = { id: categoryId };
        if (moveToCategoryId) {
            variables.moveToCategoryId = moveToCategoryId;
        }
        const result = await this.graphql.mutation(mutation, variables);
        if (result.deleteCategory.errors) {
            const errors = result.deleteCategory.errors;
            const messages = [];
            if (errors.message)
                messages.push(errors.message);
            if (errors.fieldErrors) {
                for (const fe of errors.fieldErrors) {
                    messages.push(`${fe.field}: ${fe.messages.join(', ')}`);
                }
            }
            if (messages.length > 0) {
                throw new Error(`Failed to delete category: ${messages.join('; ')}`);
            }
        }
        return result.deleteCategory.deleted;
    }
    async deleteCategories(categoryIds) {
        validateRequired({ categoryIds });
        logger.debug(`Bulk deleting ${categoryIds.length} categories`);
        const mutation = `
      mutation DeleteTransactionCategories($categoryIds: [ID!]!) {
        deleteTransactionCategories(ids: $categoryIds) {
          deletedCount
          failedCount
          errors {
            id
            message
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { categoryIds });
        return result.deleteTransactionCategories;
    }
    // Category groups methods
    async getCategoryGroups() {
        logger.debug('Fetching all category groups');
        // FIXED: The standalone transactionCategoryGroups query doesn't exist in API.
        // Extract unique groups from categories response instead.
        const categories = await this.getCategories();
        // Extract unique groups from categories
        const groupMap = new Map();
        for (const category of categories) {
            if (category.group && !groupMap.has(category.group.id)) {
                // Build group with its categories
                const categoriesInGroup = categories.filter(c => c.group?.id === category.group.id);
                groupMap.set(category.group.id, {
                    id: category.group.id,
                    name: category.group.name,
                    type: category.group.type,
                    categories: categoriesInGroup.map(c => ({
                        id: c.id,
                        name: c.name,
                        icon: c.icon,
                        order: c.order
                    }))
                });
            }
        }
        const groups = Array.from(groupMap.values());
        logger.debug(`Extracted ${groups.length} category groups from categories`);
        return groups;
    }
    async getCategoryGroupById(groupId) {
        validateRequired({ groupId });
        logger.debug(`Fetching category group by ID: ${groupId}`);
        // FIXED: The standalone transactionCategoryGroup query doesn't exist.
        // Get all groups and filter by ID.
        const groups = await this.getCategoryGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) {
            throw new Error(`Category group not found: ${groupId}`);
        }
        return group;
    }
    // Tags management methods
    async getTags() {
        logger.debug('Fetching all transaction tags');
        // FIXED: Use householdTransactionTags query with correct fields
        const query = `
      query GetTransactionTags {
        householdTransactionTags {
          id
          name
          color
          order
          __typename
        }
      }
    `;
        const result = await this.graphql.query(query);
        return result.householdTransactionTags || [];
    }
    async getTagById(tagId) {
        validateRequired({ tagId });
        logger.debug(`Fetching tag by ID: ${tagId}`);
        // FIXED: API doesn't support single tag query, so fetch all and filter
        const tags = await this.getTags();
        const tag = tags.find(t => t.id === tagId);
        if (!tag) {
            throw new Error(`Tag not found: ${tagId}`);
        }
        return tag;
    }
    async createTag(data) {
        validateRequired({ name: data.name });
        logger.debug(`Creating transaction tag: ${data.name}`);
        // FIXED: Removed invalid fields (isDefault, createdAt, updatedAt) that don't exist in API schema
        const mutation = `
      mutation CreateTransactionTag($input: CreateTransactionTagInput!) {
        createTransactionTag(input: $input) {
          tag {
            id
            name
            color
            order
          }
          errors {
            field
            message
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { input: data });
        if (result.createTransactionTag.errors?.length > 0) {
            const errorMessages = result.createTransactionTag.errors.map(e => e.message).join(', ');
            throw new Error(`Failed to create tag: ${errorMessages}`);
        }
        return result.createTransactionTag.tag;
    }
    async updateTag(tagId, data) {
        validateRequired({ tagId });
        logger.debug(`Updating tag: ${tagId}`);
        // FIXED: Removed invalid fields (isDefault, createdAt, updatedAt) that don't exist in API schema
        const mutation = `
      mutation UpdateTransactionTag($tagId: ID!, $input: UpdateTransactionTagInput!) {
        updateTransactionTag(id: $tagId, input: $input) {
          tag {
            id
            name
            color
            order
          }
          errors {
            field
            message
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { tagId, input: data });
        if (result.updateTransactionTag.errors?.length > 0) {
            const errorMessages = result.updateTransactionTag.errors.map(e => e.message).join(', ');
            throw new Error(`Failed to update tag: ${errorMessages}`);
        }
        return result.updateTransactionTag.tag;
    }
    async deleteTag(tagId) {
        validateRequired({ tagId });
        logger.debug(`Deleting tag: ${tagId}`);
        const mutation = `
      mutation DeleteTransactionTag($tagId: ID!) {
        deleteTransactionTag(id: $tagId) {
          success
          errors {
            field
            message
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { tagId });
        if (result.deleteTransactionTag.errors?.length > 0) {
            const errorMessages = result.deleteTransactionTag.errors.map(e => e.message).join(', ');
            throw new Error(`Failed to delete tag: ${errorMessages}`);
        }
        return result.deleteTransactionTag.success;
    }
    // Transaction tagging methods
    async setTransactionTags(transactionId, tagIds) {
        validateRequired({ transactionId, tagIds });
        logger.debug(`Setting tags for transaction ${transactionId}: ${tagIds.join(', ')}`);
        const mutation = `
      mutation SetTransactionTags($transactionId: ID!, $tagIds: [ID!]!) {
        setTransactionTags(transactionId: $transactionId, tagIds: $tagIds) {
          success
          errors {
            field
            message
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { transactionId, tagIds });
        if (result.setTransactionTags.errors?.length > 0) {
            const errorMessages = result.setTransactionTags.errors.map(e => e.message).join(', ');
            throw new Error(`Failed to set transaction tags: ${errorMessages}`);
        }
        return result.setTransactionTags.success;
    }
    async addTagToTransaction(transactionId, tagId) {
        validateRequired({ transactionId, tagId });
        logger.debug(`Adding tag ${tagId} to transaction ${transactionId}`);
        const mutation = `
      mutation AddTagToTransaction($transactionId: ID!, $tagId: ID!) {
        addTagToTransaction(transactionId: $transactionId, tagId: $tagId) {
          success
          errors {
            field
            message
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { transactionId, tagId });
        if (result.addTagToTransaction.errors?.length > 0) {
            const errorMessages = result.addTagToTransaction.errors.map(e => e.message).join(', ');
            throw new Error(`Failed to add tag to transaction: ${errorMessages}`);
        }
        return result.addTagToTransaction.success;
    }
    async removeTagFromTransaction(transactionId, tagId) {
        validateRequired({ transactionId, tagId });
        logger.debug(`Removing tag ${tagId} from transaction ${transactionId}`);
        const mutation = `
      mutation RemoveTagFromTransaction($transactionId: ID!, $tagId: ID!) {
        removeTagFromTransaction(transactionId: $transactionId, tagId: $tagId) {
          success
          errors {
            field
            message
          }
        }
      }
    `;
        const result = await this.graphql.mutation(mutation, { transactionId, tagId });
        if (result.removeTagFromTransaction.errors?.length > 0) {
            const errorMessages = result.removeTagFromTransaction.errors.map(e => e.message).join(', ');
            throw new Error(`Failed to remove tag from transaction: ${errorMessages}`);
        }
        return result.removeTagFromTransaction.success;
    }
}
//# sourceMappingURL=CategoriesAPI.js.map