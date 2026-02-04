export class InstitutionsAPIImpl {
    constructor(graphql) {
        this.graphql = graphql;
    }
    async getInstitutions() {
        // FIXED: Since 'institutions' field doesn't exist, extract from credentials
        // Handle case where user has no institution data gracefully
        const query = `
      query {
        credentials {
          id
          institution {
            id
            name
            url
            __typename
          }
          __typename
        }
      }
    `;
        const result = await this.graphql.query(query);
        // Extract unique institutions from credentials (handle null institutions)
        const institutionsMap = new Map();
        result.credentials.forEach(cred => {
            if (cred.institution && cred.institution.id) {
                institutionsMap.set(cred.institution.id, cred.institution);
            }
        });
        return Array.from(institutionsMap.values());
    }
    async getInstitutionSettings() {
        // FIXED: Use exact Python fragment structure
        const query = `
      query Web_GetInstitutionSettings {
        credentials {
          id
          updateRequired
          disconnectedFromDataProviderAt
          displayLastUpdatedAt
          dataProvider
          institution {
            id
            name
            url
            __typename
          }
          __typename
        }
        accounts(filters: {includeDeleted: true}) {
          id
          displayName
          subtype {
            display
            __typename
          }
          mask
          credential {
            id
            __typename
          }
          deletedAt
          __typename
        }
        subscription {
          isOnFreeTrial
          hasPremiumEntitlement
          __typename
        }
      }
    `;
        const result = await this.graphql.query(query);
        return result;
    }
}
//# sourceMappingURL=InstitutionsAPI.js.map