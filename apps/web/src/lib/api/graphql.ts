import { GraphQLClient, gql } from "graphql-request";
import { GRAPHQL_API_URL } from "./client";
import { checkRateLimit } from "./rate-limiter";
import type { Job, SystemMetrics, JobsQueryVariables, JobQueryVariables } from "../types";

// Create GraphQL client
const graphqlClient = new GraphQLClient(GRAPHQL_API_URL);

/**
 * Rate-limited GraphQL request wrapper
 */
async function gqlRequest<T>(document: string, variables?: Record<string, unknown>): Promise<T> {
  checkRateLimit();
  return graphqlClient.request<T>(document, variables);
}

// GraphQL Queries

export const JOBS_QUERY = gql`
  query Jobs($limit: Int, $offset: Int, $status: JobStatus) {
    jobs(limit: $limit, offset: $offset, status: $status) {
      id
      status
      inputKey
      errorMessage
      createdAt
      updatedAt
      renditions {
        id
        resolution
        outputKey
      }
    }
  }
`;

export const JOB_QUERY = gql`
  query Job($id: ID!) {
    job(id: $id) {
      id
      status
      inputKey
      errorMessage
      createdAt
      updatedAt
      renditions {
        id
        resolution
        outputKey
      }
    }
  }
`;

export const SYSTEM_METRICS_QUERY = gql`
  query SystemMetrics {
    systemMetrics {
      queueDepth
      totalJobs
      completedJobs
      failedJobs
      processingJobs
    }
  }
`;

// GraphQL API functions

export async function fetchJobs(variables?: JobsQueryVariables): Promise<Job[]> {
  const data = await gqlRequest<{ jobs: Job[] }>(JOBS_QUERY, variables);
  return data.jobs;
}

export async function fetchJob(variables: JobQueryVariables): Promise<Job | null> {
  const data = await gqlRequest<{ job: Job | null }>(JOB_QUERY, variables);
  return data.job;
}

export async function fetchSystemMetrics(): Promise<SystemMetrics> {
  const data = await gqlRequest<{ systemMetrics: SystemMetrics }>(SYSTEM_METRICS_QUERY);
  return data.systemMetrics;
}
