export interface QueryConditionInput {
  tableName?: string;
  select?: string[];
  conditionLambda?: string;
  conditionValue?: Record<string, any>;
  orderBy?: Record<string, 'ASC' | 'DESC'>;
  skip?: number;
  take?: number;
}
