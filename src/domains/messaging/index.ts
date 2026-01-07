import { GraphQLClient } from '../../core/transport/graphql.js';

export interface MessageThread {
  id: string;
  subject?: string;
  hasOutstandingAssistantRequests?: boolean;
  messages?: unknown[];
}

export interface AdviceResponse {
  essentials: unknown[];
  objectives: unknown[];
  adviceItemCategories: unknown[];
  profileQuestionnaire: unknown;
  objectivesQuestionnaire: unknown;
}

const ADVICE_QUERY_WEB = /* GraphQL */ `
  query AdviceQuery_Web {
    essentials {
      id
      title
      description
      category
      numTasksCompleted
      numTasksRemaining
      numTasks
      completedAt
      targetCompletionAt
      status
      updatedAt
      tasks { id title description category status updatedAt targetCompletionAt completedAt priority __typename }
      __typename
    }
    objectives {
      id
      title
      description
      category
      numTasksCompleted
      numTasksRemaining
      numTasks
      completedAt
      targetCompletionAt
      status
      updatedAt
      tasks { id title description category status updatedAt targetCompletionAt completedAt priority __typename }
      __typename
    }
    adviceItemCategories {
      name
      displayName
      description
      __typename
    }
    profileQuestionnaire { state firstQuestion __typename }
    objectivesQuestionnaire { firstQuestion __typename }
  }
`;

const COMMON_GET_MESSAGE_THREADS = /* GraphQL */ `
  query Common_GetMessageThreads {
    messageThreads {
      id
      subject
      createdAt
      lastMessageSentAt
      hasOutstandingAssistantRequests
      __typename
    }
    me { id profile __typename }
    householdPreferences { id aiAssistantEnabled __typename }
  }
`;

const COMMON_GET_MESSAGE_THREAD = /* GraphQL */ `
  query Common_GetMessageThread($threadId: ID!) {
    messageThread(threadId: $threadId) {
      id
      subject
      hasOutstandingAssistantRequests
      messages
      __typename
    }
  }
`;

const COMMON_CREATE_THREAD_MUTATION = /* GraphQL */ `
  mutation Common_CreateThreadMutation($shouldOmitWelcomeMessage: Boolean, $agentType: AgentType) {
    createMessageThread(shouldOmitWelcomeMessage: $shouldOmitWelcomeMessage, agentType: $agentType) {
      messageThread {
        id
        subject
        __typename
      }
      __typename
    }
  }
`;

const COMMON_SEND_MESSAGE = /* GraphQL */ `
  mutation Common_SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      messageThread {
        id
        hasOutstandingAssistantRequests
        messages
        __typename
      }
      __typename
    }
  }
`;

const COMMON_GET_ASSISTANT_FEEDBACK = /* GraphQL */ `
  query Common_GetAssistantFeedback($threadId: ID!) {
    assistantFeedbackByThread(threadId: $threadId)
  }
`;

const COMMON_UPDATE_USER_PROFILE = /* GraphQL */ `
  mutation Common_UpdateUserProfile(
    $updateMyHouseholdInput: UpdateHouseholdInput
    $updateProfileInput: UpdateProfileInput
    $updateMeInput: UpdateMeInput
  ) {
    updateUserProfile(updateProfileInput: $updateProfileInput) {
      userProfile
      errors
      __typename
    }
    updateMe(updateMeInput: $updateMeInput) {
      user
      errors
      __typename
    }
    updateMyHousehold(updateHouseholdInput: $updateMyHouseholdInput) {
      household
      errors
      __typename
    }
  }
`;

export class MessagingClient {
  constructor(private graphql: GraphQLClient) {}

  async getAdvice(): Promise<AdviceResponse> {
    const data = await this.graphql.query<AdviceResponse>(ADVICE_QUERY_WEB);
    return data;
  }

  async listThreads(): Promise<{ messageThreads: MessageThread[]; me: unknown; householdPreferences: unknown }> {
    const data = await this.graphql.query<{ messageThreads: MessageThread[]; me: unknown; householdPreferences: unknown }>(
      COMMON_GET_MESSAGE_THREADS
    );
    return data;
  }

  async getThread(threadId: string): Promise<MessageThread | null> {
    const data = await this.graphql.query<{ messageThread: MessageThread | null }>(
      COMMON_GET_MESSAGE_THREAD,
      { threadId }
    );
    return data.messageThread;
  }

  async createThread(params?: { shouldOmitWelcomeMessage?: boolean; agentType?: string }): Promise<MessageThread | undefined> {
    const data = await this.graphql.mutate<{ createMessageThread: { messageThread?: MessageThread } }>(
      COMMON_CREATE_THREAD_MUTATION,
      { shouldOmitWelcomeMessage: params?.shouldOmitWelcomeMessage, agentType: params?.agentType }
    );
    return data.createMessageThread?.messageThread;
  }

  async sendMessage(input: Record<string, unknown>): Promise<MessageThread | undefined> {
    const data = await this.graphql.mutate<{ sendMessage: { messageThread?: MessageThread } }>(
      COMMON_SEND_MESSAGE,
      { input }
    );
    return data.sendMessage?.messageThread;
  }

  async getAssistantFeedback(threadId: string): Promise<unknown> {
    const data = await this.graphql.query<{ assistantFeedbackByThread: unknown }>(
      COMMON_GET_ASSISTANT_FEEDBACK,
      { threadId }
    );
    return data.assistantFeedbackByThread;
  }

  async updateUserProfile(payload: {
    updateMyHouseholdInput?: Record<string, unknown>;
    updateProfileInput?: Record<string, unknown>;
    updateMeInput?: Record<string, unknown>;
  }): Promise<unknown> {
    const data = await this.graphql.query<unknown>(
      COMMON_UPDATE_USER_PROFILE,
      {
        updateMyHouseholdInput: payload.updateMyHouseholdInput,
        updateProfileInput: payload.updateProfileInput,
        updateMeInput: payload.updateMeInput,
      }
    );
    return data;
  }
}
