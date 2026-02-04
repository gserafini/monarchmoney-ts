import { GraphQLClient } from '../../client/graphql';
export interface Institution {
    id: string;
    name: string;
    url?: string;
    logoUrl?: string;
    primaryColor?: string;
}
export interface Credential {
    id: string;
    updateRequired: boolean;
    disconnectedFromDataProviderAt?: string;
    displayLastUpdatedAt?: string;
    dataProvider: string;
    institution: {
        id: string;
        name: string;
        url: string;
    } | null;
}
export interface InstitutionSettings {
    credentials: Credential[];
    accounts: Array<{
        id: string;
        displayName: string;
        subtype?: {
            display: string;
        };
        mask?: string;
        credential: {
            id: string;
        };
        deletedAt?: string;
    }>;
    subscription: {
        isOnFreeTrial: boolean;
        hasPremiumEntitlement: boolean;
    };
}
export interface InstitutionsAPI {
    /**
     * Get all available financial institutions
     */
    getInstitutions(): Promise<Institution[]>;
    /**
     * Get detailed institution settings including credentials and linked accounts
     */
    getInstitutionSettings(): Promise<InstitutionSettings>;
}
export declare class InstitutionsAPIImpl implements InstitutionsAPI {
    private graphql;
    constructor(graphql: GraphQLClient);
    getInstitutions(): Promise<Institution[]>;
    getInstitutionSettings(): Promise<InstitutionSettings>;
}
//# sourceMappingURL=InstitutionsAPI.d.ts.map