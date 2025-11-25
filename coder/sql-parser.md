### @cs/sql-parser代码库源码整理

#### 代码目录
```
@cs/sql-parser/
├── src/
├── ast-transformer.ts
├── base-sql-processor.ts
├── database-name-rewriter.ts
├── errors.ts
├── hint-parser.ts
├── index.ts
├── sql-parser-utils.ts
├── sql-rewriter.ts
└── types.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/sql-parser",
  "version": "1.0.0",
  "description": "sql处理工具包",
  "author": "danielmlc <danielmlc@126.com>",
  "homepage": "",
  "license": "ISC",
  "main": "lib/index.js",
  "directories": {
    "lib": "lib"
  },
  "files": [
    "lib"
  ],
  "scripts": {
    "test": "node -r ts-node/register test/test.ts",
    "test2": "node -r ts-node/register test/wrapper-statement-test.ts",
    "test:sql": "node -r ts-node/register test/sql-file-test.ts",
    "prebuild": "rimraf lib",
    "build": "tsc -p ./tsconfig.json",
    "watch": "tsc -p ./tsconfig.json --watch",
    "publish": "pnpm publish --no-git-checks",
    "pre-publish:beta": "pnpm version prerelease --preid=beta",
    "publish:beta": "pnpm run pre-publish:beta && pnpm publish --no-git-checks --tag beta"
  },
  "dependencies": {
    "node-sql-parser": "^5.3.12"
  }
}

```


> 代码路径  `src\ast-transformer.ts`

```typescript
import {
  AST,
  Binary,
  ExpressionValue,
  ColumnRef,
  From,
  Select,
  Insert_Replace,
  Update,
  Delete,
  ValueExpr,
  ExprList,
  SetList,
  TableExpr,
  Join,
  BaseFrom,
  OrderBy,
  With,
} from 'node-sql-parser';
import {
  TenantCondition,
  TransformContext,
  TableInfo,
  ExtendedAST,
  ConditionBuilder,
  TargetDatabaseConfig,
} from './types';
import { AstTransformError } from './errors';

/**
 * AST转换器
 * 负责遍历和修改抽象语法树，添加租户过滤条件
 */
export class AstTransformer {
  /**
   * 检查数据库名是否需要添加租户条件
   * @param dbName 数据库名
   * @param targetDatabaseConfig 目标库配置
   * @returns 是否需要处理
   * @throws ConfigError 当没有配置默认库且遇到无库名表时
   */
  private static isTargetDatabase(
    dbName: string | null | undefined,
    targetDatabaseConfig?: TargetDatabaseConfig,
  ): boolean {
    if (!targetDatabaseConfig) {
      throw new Error('目标数据库配置不能为空');
    }

    // 如果没有数据库名，必须使用默认库名进行判断
    if (!dbName) {
      if (!targetDatabaseConfig.defaultDatabase) {
        throw new Error(
          '遇到无库名表，但未配置默认库名(defaultDatabase)，请在配置中设置defaultDatabase',
        );
      }
      // 使用默认库名继续判断
      dbName = targetDatabaseConfig.defaultDatabase;
    }

    // 检查完整库名匹配
    if (targetDatabaseConfig.fullNames.includes(dbName)) {
      return true;
    }

    // 检查前缀匹配
    return targetDatabaseConfig.prefixes.some((prefix) =>
      dbName.startsWith(prefix),
    );
  }

  /**
   * 过滤需要添加租户条件的表
   * @param tableInfo 表信息
   * @param targetDatabaseConfig 目标库配置
   * @returns 是否需要处理此表
   */
  private static shouldProcessTable(
    tableInfo: TableInfo,
    targetDatabaseConfig?: TargetDatabaseConfig,
  ): boolean {
    return this.isTargetDatabase(tableInfo.db, targetDatabaseConfig);
  }

  /**
   * 检查INSERT语句的目标表是否需要处理
   * @param insertAst INSERT语句AST
   * @param targetDatabaseConfig 目标库配置
   * @returns 是否需要处理
   */
  private static shouldProcessInsertTable(
    insertAst: Insert_Replace,
    targetDatabaseConfig?: TargetDatabaseConfig,
  ): boolean {
    if (!insertAst.table || insertAst.table.length === 0) {
      return false;
    }

    const targetTable = insertAst.table[0];
    if ('table' in targetTable && targetTable.table) {
      const tableInfo: TableInfo = {
        name: targetTable.table,
        alias: targetTable.as,
        db: targetTable.db,
        fullName: targetTable.db
          ? `${targetTable.db}.${targetTable.table}`
          : targetTable.table,
      };
      return this.shouldProcessTable(tableInfo, targetDatabaseConfig);
    }

    return true; // 如果无法确定表信息，默认处理
  }
  /**
   * 转换AST，添加租户过滤条件
   * @param ast 抽象语法树
   * @param tenantCondition 租户条件
   * @param targetDatabaseConfig 目标库配置
   * @returns 转换后的AST
   */
  static transform(
    ast: AST | AST[],
    tenantCondition: TenantCondition,
    targetDatabaseConfig?: TargetDatabaseConfig,
  ): AST | AST[] {
    try {
      if (Array.isArray(ast)) {
        return ast.map((item) =>
          this.transformSingleAst(item, tenantCondition, targetDatabaseConfig),
        );
      }
      return this.transformSingleAst(
        ast,
        tenantCondition,
        targetDatabaseConfig,
      );
    } catch (error) {
      throw new AstTransformError(
        `AST转换失败: ${error instanceof Error ? error.message : error}`,
        JSON.stringify(ast),
        Array.isArray(ast) ? 'array' : ast.type,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 转换单个AST节点
   */
  private static transformSingleAst(
    ast: AST,
    tenantCondition: TenantCondition,
    targetDatabaseConfig?: TargetDatabaseConfig,
  ): AST {
    const context: TransformContext = {
      tenantCondition,
      currentTables: new Set(),
      targetTables: new Set(),
      cteTableNames: new Set(),
      inSubQuery: false,
      targetDatabaseConfig,
    };

    switch (ast.type) {
      case 'select':
        return this.transformSelect(ast as Select, context);
      case 'insert':
      case 'replace':
        return this.transformInsert(ast as Insert_Replace, context);
      case 'update':
        return this.transformUpdate(ast as Update, context);
      case 'delete':
        return this.transformDelete(ast as Delete, context);
      default:
        // 对于不需要处理的SQL类型，直接返回原AST
        return ast;
    }
  }

  /**
   * 转换SELECT语句
   */
  private static transformSelect(
    ast: Select,
    context: TransformContext,
  ): Select {
    const result = { ...ast } as Select;

    // 处理WITH子句
    if (result.with) {
      result.with = this.transformWith(result.with, context);
    }

    // 收集表信息
    if (result.from) {
      this.collectTablesFromFrom(result.from, context);
    }

    // 处理FROM子句中的子查询
    if (result.from) {
      result.from = this.transformFrom(result.from, context) as
        | From[]
        | TableExpr;
    }

    // 添加WHERE条件
    result.where = this.addTenantConditionToWhere(
      result.where,
      context.tenantCondition,
      context.targetTables,
    );

    // 处理子查询 - 在WHERE、HAVING等子句中
    if (result.where) {
      result.where = this.transformExpressionValue(
        result.where,
        context,
      ) as Binary;
    }

    if (result.having) {
      result.having = result.having.map((item) =>
        this.transformExpressionValue(item, context),
      );
    }

    // 处理SELECT列中的子查询
    if (result.columns && Array.isArray(result.columns)) {
      result.columns = result.columns.map((col) => {
        if (typeof col === 'object' && col.expr) {
          return {
            ...col,
            expr: this.transformExpressionValue(col.expr, context),
          };
        }
        return col;
      });
    }

    // 处理ORDER BY中的子查询
    if (result.orderby) {
      result.orderby = result.orderby.map((order) => ({
        ...order,
        expr: this.transformExpressionValue(order.expr, context),
      }));
    }

    // 处理UNION等集合操作
    if (result._next) {
      // 为UNION操作的后续SELECT创建独立的上下文
      const unionContext: TransformContext = {
        ...context,
        currentTables: new Set<string>(),
        targetTables: new Set<string>(),
        // 保持租户条件、CTE表名和其他配置不变
      };
      result._next = this.transformSelect(result._next, unionContext);
    }

    return result;
  }

  /**
   * 转换INSERT语句
   */
  private static transformInsert(
    ast: Insert_Replace,
    context: TransformContext,
  ): Insert_Replace {
    const result = { ...ast } as Insert_Replace;

    // 检查INSERT的目标表是否需要处理
    const shouldAddTenant = this.shouldProcessInsertTable(
      result,
      context.targetDatabaseConfig,
    );

    let tenantFieldAdded = false;
    if (shouldAddTenant) {
      // 检查是INSERT...SET还是INSERT...VALUES语法
      const resultWithSet = result as any;
      if (resultWithSet.set && Array.isArray(resultWithSet.set)) {
        // INSERT...SET语法：在set数组中添加租户字段
        const hasTenantField = resultWithSet.set.some(
          (setItem: any) => setItem.column === context.tenantCondition.field,
        );
        if (!hasTenantField) {
          resultWithSet.set.push({
            column: context.tenantCondition.field,
            value: {
              type: 'single_quote_string',
              value: context.tenantCondition.value,
            },
            table: null,
          });
          tenantFieldAdded = true;
        }
      } else {
        // INSERT...VALUES语法：在columns中添加租户字段
        result.columns = result.columns || [];
        const originalColumns = [...result.columns];
        result.columns = this.addTenantFieldToInsert(
          result.columns,
          context.tenantCondition,
        );
        tenantFieldAdded = result.columns.length > originalColumns.length;
      }
    }

    // 如果是INSERT ... SELECT形式，需要转换SELECT部分
    if (
      result.values &&
      typeof result.values === 'object' &&
      'type' in result.values
    ) {
      if (result.values.type === 'select') {
        result.values = this.transformSelect(result.values as Select, context);

        // 如果添加了tenant字段，也需要在SELECT的columns中添加对应的租户值
        if (tenantFieldAdded && result.values.columns) {
          const tenantColumn = {
            expr: {
              type: 'single_quote_string',
              value: context.tenantCondition.value,
            } as any,
            as: null,
          };
          result.values.columns = [...result.values.columns, tenantColumn];
        }
      }
    }

    // 为VALUES添加租户值（只有在需要处理且添加了字段的情况下）
    if (
      shouldAddTenant &&
      tenantFieldAdded &&
      result.values &&
      typeof result.values === 'object'
    ) {
      if ('type' in result.values) {
        if (result.values.type === 'select') {
          // INSERT ... SELECT 情况已在上面处理
        } else if (
          (result.values as any).type === 'values' &&
          (result.values as any).values
        ) {
          // 处理 INSERT ... VALUES 情况
          (result.values as any).values = this.addTenantValueToInsert(
            (result.values as any).values,
            context.tenantCondition,
          );
        }
      }
    } else if (
      shouldAddTenant &&
      tenantFieldAdded &&
      Array.isArray(result.values)
    ) {
      // 处理直接的数组情况
      result.values = this.addTenantValueToInsert(
        result.values,
        context.tenantCondition,
      );
    }

    return result;
  }

  /**
   * 转换UPDATE语句
   */
  private static transformUpdate(
    ast: Update,
    context: TransformContext,
  ): Update {
    const result = { ...ast } as Update;

    // 收集表信息
    if (result.table) {
      this.collectTablesFromFrom(result.table, context);
    }

    // 处理FROM子句中的子查询（如果有）
    if (result.table) {
      result.table = this.transformFrom(result.table, context) as Array<From>;
    }

    // 添加WHERE条件
    result.where = this.addTenantConditionToWhere(
      result.where,
      context.tenantCondition,
      context.targetTables,
    );

    // 处理SET子句中的子查询
    if (result.set) {
      result.set = result.set.map((setItem) => ({
        ...setItem,
        value: this.transformExpressionValue(setItem.value, context),
      }));
    }

    // 处理WHERE子句中的子查询
    if (result.where) {
      result.where = this.transformExpressionValue(
        result.where,
        context,
      ) as Binary;
    }

    return result;
  }

  /**
   * 转换DELETE语句
   */
  private static transformDelete(
    ast: Delete,
    context: TransformContext,
  ): Delete {
    const result = { ...ast } as Delete;

    // 收集表信息
    if (result.from) {
      this.collectTablesFromFrom(result.from, context);
    }

    // 处理FROM子句中的子查询
    if (result.from) {
      result.from = this.transformFrom(result.from, context) as Array<From>;
    }

    // 添加WHERE条件
    result.where = this.addTenantConditionToWhere(
      result.where,
      context.tenantCondition,
      context.targetTables,
    );

    // 处理WHERE子句中的子查询
    if (result.where) {
      result.where = this.transformExpressionValue(
        result.where,
        context,
      ) as Binary;
    }

    return result;
  }

  /**
   * 转换WITH子句
   */
  private static transformWith(
    withClause: With[],
    context: TransformContext,
  ): With[] {
    // 收集CTE表名
    withClause.forEach((withItem) => {
      if (
        withItem.name &&
        typeof withItem.name === 'object' &&
        'value' in withItem.name
      ) {
        context.cteTableNames.add(withItem.name.value);
      }
    });

    return withClause.map((withItem) => {
      // 为CTE内部查询创建完全独立的上下文
      const newContext: TransformContext = {
        ...context,
        inSubQuery: true,
        currentTables: new Set<string>(),
        targetTables: new Set<string>(),
        // CTE名称列表保持共享，这样嵌套CTE可以识别外层的CTE表名
      };
      return {
        ...withItem,
        stmt: {
          ...withItem.stmt,
          ast: this.transformSelect(withItem.stmt.ast, newContext),
        },
      };
    });
  }

  /**
   * 转换FROM子句
   */
  private static transformFrom(
    from: From[] | From | TableExpr,
    context: TransformContext,
  ): From[] | From | TableExpr {
    if (Array.isArray(from)) {
      return from.map((item) => this.transformFromItem(item, context));
    }
    return this.transformFromItem(from, context);
  }

  /**
   * 转换单个FROM项
   */
  private static transformFromItem(
    fromItem: From,
    context: TransformContext,
  ): From {
    // 处理子查询表表达式
    if ('expr' in fromItem && fromItem.expr) {
      const tableExpr = fromItem as TableExpr;
      const newContext = {
        ...context,
        inSubQuery: true,
        currentTables: new Set<string>(),
        targetTables: new Set<string>(),
      };
      return {
        ...tableExpr,
        expr: {
          ...tableExpr.expr,
          ast: this.transformSelect(tableExpr.expr.ast, newContext),
        },
      };
    }

    // 处理JOIN
    if ('join' in fromItem) {
      const joinItem = fromItem as Join;
      // JOIN的ON条件中可能包含子查询
      if (joinItem.on) {
        joinItem.on = this.transformExpressionValue(
          joinItem.on,
          context,
        ) as Binary;
      }
    }

    return fromItem;
  }

  /**
   * 转换表达式值（处理子查询）
   */
  private static transformExpressionValue(
    expr: any,
    context: TransformContext,
  ): any {
    if (!expr || typeof expr !== 'object') {
      return expr;
    }

    // 处理二元表达式
    if (expr.type === 'binary_expr') {
      return {
        ...expr,
        left: this.transformExpressionValue(expr.left, context),
        right: this.transformExpressionValue(expr.right, context),
      };
    }

    // 处理函数表达式中的子查询
    if (expr.type === 'function' && expr.args && expr.args.value) {
      return {
        ...expr,
        args: {
          ...expr.args,
          value: expr.args.value.map((arg: any) =>
            this.transformExpressionValue(arg, context),
          ),
        },
      };
    }

    // 处理表达式列表
    if (expr.type === 'expr_list') {
      return {
        ...expr,
        value: expr.value.map((item: any) =>
          this.transformExpressionValue(item, context),
        ),
      };
    }

    // 处理子查询（SELECT）
    if (expr.type === 'select') {
      // 为子查询创建完全独立的上下文
      const newContext: TransformContext = {
        ...context,
        inSubQuery: true,
        currentTables: new Set<string>(),
        targetTables: new Set<string>(),
        // 保持租户条件、CTE表名和其他配置不变
      };
      return this.transformSelect(expr, newContext);
    }

    // 处理包含AST的子查询（常见于WHERE子句中的子查询）
    if (
      expr.ast &&
      typeof expr.ast === 'object' &&
      expr.ast.type === 'select'
    ) {
      // 为子查询创建完全独立的上下文
      const newContext: TransformContext = {
        ...context,
        inSubQuery: true,
        currentTables: new Set<string>(),
        targetTables: new Set<string>(),
        // 保持租户条件、CTE表名和其他配置不变
      };
      return {
        ...expr,
        ast: this.transformSelect(expr.ast, newContext),
      };
    }

    return expr;
  }

  /**
   * 从FROM子句收集表信息
   */
  private static collectTablesFromFrom(
    from: From[] | From,
    context: TransformContext,
  ): void {
    const fromArray = Array.isArray(from) ? from : [from];

    fromArray.forEach((item) => {
      const tableInfo = this.extractTableInfo(item);
      if (tableInfo) {
        const tableAlias = tableInfo.alias || tableInfo.name;

        // 检查是否为CTE临时表，如果是则跳过
        if (context.cteTableNames.has(tableInfo.name)) {
          // CTE临时表只添加到currentTables，不添加到targetTables
          context.currentTables.add(tableAlias);
          return;
        }

        context.currentTables.add(tableAlias);

        // 只有匹配的目标库中的表才添加到targetTables
        if (this.shouldProcessTable(tableInfo, context.targetDatabaseConfig)) {
          context.targetTables.add(tableAlias);
        }
      }
    });
  }

  /**
   * 提取表信息
   */
  private static extractTableInfo(from: From): TableInfo | null {
    if ('table' in from && from.table) {
      const baseFrom = from as BaseFrom;
      return {
        name: baseFrom.table,
        alias: baseFrom.as,
        db: baseFrom.db,
        fullName: baseFrom.db
          ? `${baseFrom.db}.${baseFrom.table}`
          : baseFrom.table,
      };
    }
    return null;
  }

  /**
   * 为WHERE子句添加租户条件
   */
  private static addTenantConditionToWhere(
    existingWhere: Binary | any | null,
    tenantCondition: TenantCondition,
    targetTables: Set<string>,
  ): Binary {
    const tenantConditions = this.buildTenantConditionsForTables(
      tenantCondition,
      targetTables,
    );

    if (tenantConditions.length === 0) {
      return existingWhere;
    }

    let combinedTenantCondition: Binary;
    if (tenantConditions.length === 1) {
      combinedTenantCondition = tenantConditions[0];
    } else {
      // 多个表的租户条件用AND连接
      combinedTenantCondition = tenantConditions.reduce((acc, curr) =>
        this.createAndCondition(acc, curr),
      );
    }

    if (!existingWhere) {
      return combinedTenantCondition;
    }

    return this.createAndCondition(existingWhere, combinedTenantCondition);
  }

  /**
   * 为多个表构建租户条件
   */
  private static buildTenantConditionsForTables(
    tenantCondition: TenantCondition,
    tables: Set<string>,
  ): Binary[] {
    const conditions: Binary[] = [];

    tables.forEach((table) => {
      conditions.push(
        this.createTenantCondition(
          table,
          tenantCondition.field,
          tenantCondition.value,
        ),
      );
    });

    return conditions;
  }

  /**
   * 创建租户条件表达式
   */
  private static createTenantCondition(
    table: string | null,
    field: string,
    value: string,
  ): Binary {
    const leftExpr: ColumnRef = {
      type: 'column_ref',
      table: table,
      column: field,
    };

    const rightExpr: ValueExpr = {
      type: 'single_quote_string',
      value: value,
    };

    return {
      type: 'binary_expr',
      operator: '=',
      left: leftExpr,
      right: rightExpr,
    };
  }

  /**
   * 创建AND条件
   */
  private static createAndCondition(left: Binary, right: Binary): Binary {
    return {
      type: 'binary_expr',
      operator: 'AND',
      left: left,
      right: right,
    };
  }

  /**
   * 为INSERT语句添加租户字段
   */
  private static addTenantFieldToInsert(
    columns: string[],
    tenantCondition: TenantCondition,
  ): string[] {
    if (!columns.includes(tenantCondition.field)) {
      return [...columns, tenantCondition.field];
    }
    return columns;
  }

  /**
   * 为INSERT VALUES添加租户值
   */
  private static addTenantValueToInsert(
    values: any[],
    tenantCondition: TenantCondition,
  ): any[] {
    return values.map((valueGroup) => {
      if (valueGroup.type === 'expr_list' && valueGroup.value) {
        const tenantValue: ValueExpr = {
          type: 'single_quote_string',
          value: tenantCondition.value,
        };

        return {
          ...valueGroup,
          value: [...valueGroup.value, tenantValue],
        };
      }
      return valueGroup;
    });
  }
}

```


> 代码路径  `src\base-sql-processor.ts`

```typescript
import { AST } from 'node-sql-parser';
import { SqlParserUtils } from './sql-parser-utils';
import { CommentInfo, WrapperStatementConfig, WrapperInfo } from './types';
import { ErrorUtils } from './errors';

/**
 * SQL处理器抽象基类
 * 提供模板方法模式，封装通用的SQL处理流程
 * 子类只需实现特定的AST处理逻辑
 */
export abstract class BaseSqlProcessor {
  /**
   * 获取支持的SQL类型列表
   * 子类需要实现此方法来指定支持哪些SQL类型
   */
  protected abstract getSupportedSqlTypes(): string[];

  /**
   * 获取数据库类型
   * 子类需要实现此方法来指定数据库类型
   */
  protected abstract getDatabase(): string;

  /**
   * 是否在遇到不支持的SQL类型时抛出异常
   * 默认为false（仅警告），子类可以重写
   */
  protected shouldThrowOnUnsupportedType(): boolean {
    return false;
  }

  /**
   * 处理AST的具体实现
   * 子类需要实现此方法来定义如何处理AST
   * @param ast 解析后的AST
   * @returns 处理结果，如果返回修改信息，则表示AST被修改了
   */
  protected abstract processAst(ast: AST | AST[]): any;

  /**
   * 子类可以重写此方法来决定是否支持包装型语句
   * 默认返回false，子类需要显式启用
   */
  protected supportWrapperStatements(): boolean {
    return false;
  }

  /**
   * 子类可以重写此方法来提供包装型语句配置
   * 默认返回undefined，子类需要提供具体配置
   */
  protected getWrapperStatementsConfig(): WrapperStatementConfig | undefined {
    return undefined;
  }

  /**
   * 子类可以重写此方法来指定支持的包装型语句类型
   * 这是getWrapperStatementsConfig的简化版本
   */
  protected getSupportedWrapperTypes(): string[] {
    return [];
  }

  /**
   * 模板方法：完整的SQL处理流程
   * 1. 预处理包装型语句
   * 2. 提取注释
   * 3. 预处理DEFAULT值
   * 4. 解析AST
   * 5. 验证SQL类型
   * 6. 调用子类的具体处理方法
   * 7. 转换回SQL
   * 8. 后处理DEFAULT值
   * 9. 组合注释
   * 10. 恢复包装型语句
   *
   * @param sql 原始SQL语句
   * @returns 处理结果
   */
  protected processWithComments(sql: string): {
    sql: string;
    modified: boolean;
    result?: any;
    comments: CommentInfo[];
  } {
    // 输入验证
    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
      return {
        sql,
        modified: false,
        comments: [],
      };
    }

    // 1. 预处理包装型语句（新增）
    let wrapperInfo: WrapperInfo = {
      hasWrapper: false,
      wrapperType: '',
      prefix: '',
      innerSql: sql,
      originalSql: sql,
    };
    let sqlToProcess = sql;

    if (this.supportWrapperStatements()) {
      // 获取包装型语句配置
      let wrapperConfig = this.getWrapperStatementsConfig();

      // 如果没有提供完整配置，则使用简化配置
      if (!wrapperConfig) {
        const supportedTypes = this.getSupportedWrapperTypes();
        if (supportedTypes.length > 0) {
          wrapperConfig = {
            enabled: true,
            supportedTypes,
            validateInnerSql: true,
          };
        }
      }

      if (wrapperConfig) {
        wrapperInfo = SqlParserUtils.preprocessWrapperStatements(
          sql,
          wrapperConfig,
        );

        // if (wrapperInfo.hasWrapper) {
        //   sqlToProcess = wrapperInfo.innerSql;
        //   console.log(`检测到包装型语句: ${wrapperInfo.wrapperType}`);
        // }
      }
    }

    // 2. 提取注释信息（容错处理）
    let allComments: CommentInfo[] = [];
    let cleanSql: string = sqlToProcess;

    try {
      allComments = SqlParserUtils.extractAllComments(sqlToProcess);
      cleanSql = SqlParserUtils.removeAllComments(sqlToProcess);
    } catch (error) {
      console.warn(
        '提取注释失败，使用原始SQL:',
        ErrorUtils.getErrorMessage(error),
      );
      // 注释提取失败，cleanSql 保持为原始 sqlToProcess
    }

    try {
      // 3. 解析纯SQL为AST（包含DEFAULT预处理）
      const ast = SqlParserUtils.parseToAst(cleanSql, this.getDatabase());

      // 4. 验证SQL类型是否支持
      SqlParserUtils.validateSqlType(
        ast,
        this.getSupportedSqlTypes(),
        cleanSql,
        this.shouldThrowOnUnsupportedType(),
      );

      // 5. 执行子类的具体处理逻辑
      const result = this.processAst(ast);

      // 6. 将AST转换回SQL（包含DEFAULT后处理）
      const processedCleanSql = SqlParserUtils.astToSql(
        ast,
        this.getDatabase(),
      );

      // 7. 重新组合注释和SQL
      const sqlWithComments =
        allComments.length > 0
          ? SqlParserUtils.combineCommentsAndSql(allComments, processedCleanSql)
          : processedCleanSql;

      // 8. 恢复包装型语句（新增）
      const finalSql = SqlParserUtils.postprocessWrapperStatements(
        sqlWithComments,
        wrapperInfo,
      );

      return {
        sql: finalSql,
        modified:
          processedCleanSql !== cleanSql.trim() || wrapperInfo.hasWrapper,
        result,
        comments: allComments,
      };
    } catch (error) {
      // 处理失败时返回原SQL（包含注释和包装）
      console.warn(
        'SQL处理失败，返回原SQL:',
        ErrorUtils.getErrorMessage(error),
      );

      // 失败时也要恢复包装结构
      const fallbackSql =
        allComments.length > 0
          ? SqlParserUtils.combineCommentsAndSql(allComments, cleanSql)
          : sqlToProcess;

      const finalSql = SqlParserUtils.postprocessWrapperStatements(
        fallbackSql,
        wrapperInfo,
      );

      return {
        sql: finalSql,
        modified: false,
        comments: allComments,
      };
    }
  }

  /**
   * 简化的处理方法，不保留注释
   * 适用于只需要处理纯SQL的场景
   *
   * @param cleanSql 纯SQL语句（不包含注释）
   * @returns 处理结果
   */
  protected processCleanSql(cleanSql: string): {
    sql: string;
    modified: boolean;
    result?: any;
  } {
    // 输入验证
    if (
      !cleanSql ||
      typeof cleanSql !== 'string' ||
      cleanSql.trim().length === 0
    ) {
      return {
        sql: cleanSql,
        modified: false,
      };
    }

    try {
      // 1. 解析SQL为AST
      const ast = SqlParserUtils.parseToAst(cleanSql, this.getDatabase());

      // 2. 验证SQL类型
      SqlParserUtils.validateSqlType(
        ast,
        this.getSupportedSqlTypes(),
        cleanSql,
        this.shouldThrowOnUnsupportedType(),
      );

      // 3. 执行处理
      const result = this.processAst(ast);

      // 4. 转换回SQL
      const processedSql = SqlParserUtils.astToSql(ast, this.getDatabase());

      return {
        sql: processedSql,
        modified: processedSql !== cleanSql.trim(),
        result,
      };
    } catch (error) {
      // 处理失败时返回原SQL
      console.warn(
        'SQL处理失败，返回原SQL:',
        ErrorUtils.getErrorMessage(error),
      );

      return {
        sql: cleanSql,
        modified: false,
      };
    }
  }

  /**
   * 批量处理SQL列表
   * @param sqlList SQL列表
   * @returns 处理结果列表
   */
  protected batchProcess(sqlList: string[]): Array<{
    sql: string;
    modified: boolean;
    result?: any;
    comments: CommentInfo[];
  }> {
    return sqlList.map((sql) => {
      try {
        return this.processWithComments(sql);
      } catch (error) {
        console.warn('SQL处理失败:', ErrorUtils.getErrorMessage(error));
        return {
          sql,
          modified: false,
          comments: [],
        };
      }
    });
  }

  /**
   * 验证SQL是否可以被当前处理器处理
   * @param sql SQL语句
   * @returns 是否可以处理
   */
  protected canProcess(sql: string): boolean {
    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
      return false;
    }

    try {
      const cleanSql = SqlParserUtils.removeAllComments(sql);
      const ast = SqlParserUtils.parseToAst(cleanSql, this.getDatabase());

      // 检查是否为支持的SQL类型
      const astArray = Array.isArray(ast) ? ast : [ast];
      const supportedTypes = this.getSupportedSqlTypes();

      return astArray.every((astItem) => supportedTypes.includes(astItem.type));
    } catch {
      return false;
    }
  }

  /**
   * 获取SQL的详细信息
   * @param sql SQL语句
   * @returns 详细信息
   */
  protected getDetailedInfo(sql: string): {
    isValid: boolean;
    sqlType: string | null;
    canProcess: boolean;
    hasComments: boolean;
    cleanSql: string;
  } {
    const cleanSql = SqlParserUtils.removeAllComments(sql);
    const isValid = SqlParserUtils.isValidSql(cleanSql, this.getDatabase());
    const sqlType = SqlParserUtils.getSqlType(cleanSql, this.getDatabase());
    const canProcess = this.canProcess(sql);
    const hasComments = SqlParserUtils.extractAllComments(sql).length > 0;

    return {
      isValid,
      sqlType,
      canProcess,
      hasComments,
      cleanSql,
    };
  }

  /**
   * 子类可以重写此方法来自定义错误处理
   * @param error 错误对象
   * @param sql 原始SQL
   * @returns 是否应该重新抛出错误
   */
  protected handleError(error: any, sql: string): boolean {
    console.warn(
      'SQL处理出错:',
      ErrorUtils.getErrorMessage(error),
      'SQL:',
      sql.substring(0, 100),
    );
    return false; // 默认不重新抛出，子类可以重写
  }
}

```


> 代码路径  `src\database-name-rewriter.ts`

```typescript
import { AST, From, ColumnRef } from 'node-sql-parser';
import { BaseSqlProcessor } from './base-sql-processor';
import {
  DatabaseRewriteConfig,
  DatabaseRewriteResult,
  DatabaseRewriteOnlyResult,
} from './types';
import { ConfigError } from './errors';

/**
 * 数据库名改写器
 * 负责根据配置对SQL中出现的数据库名进行改写
 * 现在继承BaseSqlProcessor来复用通用功能
 */
export class DatabaseNameRewriter extends BaseSqlProcessor {
  private config: DatabaseRewriteConfig;

  constructor(config: DatabaseRewriteConfig) {
    super();
    this.validateConfig(config);
    this.config = {
      ...config,
      // 默认包装型语句配置
      wrapperStatements: {
        enabled: false, // 默认关闭，需要显式启用
        supportedTypes: [],
        validateInnerSql: true,
        ...config.wrapperStatements,
      },
    };

    // 设置默认值
    if (this.config.preserveOriginalName === undefined) {
      this.config.preserveOriginalName = true;
    }

    // console.log('DatabaseNameRewriter finalConfig:', this.config);
  }

  /**
   * 实现BaseSqlProcessor的抽象方法：获取支持的SQL类型
   */
  protected getSupportedSqlTypes(): string[] {
    return ['select', 'insert', 'replace', 'update', 'delete'];
  }

  /**
   * 实现BaseSqlProcessor的抽象方法：获取数据库类型
   */
  protected getDatabase(): string {
    return 'mysql';
  }

  /**
   * 实现BaseSqlProcessor的抽象方法：是否在遇到不支持的SQL类型时抛出异常
   */
  protected shouldThrowOnUnsupportedType(): boolean {
    return false; // 数据库改写器默认不抛出异常，只警告
  }

  /**
   * 实现BaseSqlProcessor的抽象方法：处理AST
   * 执行数据库名改写
   */
  protected processAst(ast: AST | AST[]): DatabaseRewriteResult[] {
    return this.rewriteAst(ast);
  }

  /**
   * 重写基类方法：是否支持包装型语句
   */
  protected supportWrapperStatements(): boolean {
    return this.config.wrapperStatements?.enabled ?? false;
  }

  /**
   * 重写基类方法：获取包装型语句配置
   */
  protected getWrapperStatementsConfig() {
    return this.config.wrapperStatements;
  }

  /**
   * 重写基类方法：获取支持的包装型语句类型
   */
  protected getSupportedWrapperTypes(): string[] {
    if (!this.config.wrapperStatements?.enabled) {
      return [];
    }
    return (
      this.config.wrapperStatements.supportedTypes || ['EXPLAIN', 'DESCRIBE']
    );
  }

  /**
   * 验证配置参数
   */
  private validateConfig(config: DatabaseRewriteConfig): void {
    if (!config) {
      throw new ConfigError('Database rewrite configuration cannot be empty');
    }

    if (typeof config.enabled !== 'boolean') {
      throw new ConfigError('Database rewrite enabled must be a boolean');
    }

    if (!config.enabled) {
      return; // 如果未启用，不需要验证其他参数
    }

    if (!config.dbPrefix || typeof config.dbPrefix !== 'string') {
      throw new ConfigError(
        'Database prefix (dbPrefix) must be a non-empty string',
      );
    }

    if (config.dbPrefix.trim().length === 0) {
      throw new ConfigError(
        'Database prefix cannot be empty or whitespace only',
      );
    }

    // 验证目标数据库列表
    if (config.targetDatabases && !Array.isArray(config.targetDatabases)) {
      throw new ConfigError('Target databases must be an array');
    }

    // 验证排除数据库列表
    if (config.excludeDatabases && !Array.isArray(config.excludeDatabases)) {
      throw new ConfigError('Exclude databases must be an array');
    }

    // 验证包装型语句配置
    if (config.wrapperStatements) {
      const wrapperConfig = config.wrapperStatements;

      if (typeof wrapperConfig.enabled !== 'boolean') {
        throw new ConfigError('WrapperStatements enabled must be a boolean');
      }

      if (
        wrapperConfig.enabled &&
        (!wrapperConfig.supportedTypes ||
          !Array.isArray(wrapperConfig.supportedTypes))
      ) {
        throw new ConfigError(
          'WrapperStatements supportedTypes must be an array when enabled',
        );
      }

      if (
        wrapperConfig.validateInnerSql !== undefined &&
        typeof wrapperConfig.validateInnerSql !== 'boolean'
      ) {
        throw new ConfigError(
          'WrapperStatements validateInnerSql must be a boolean',
        );
      }

      if (
        wrapperConfig.customPatterns !== undefined &&
        !Array.isArray(wrapperConfig.customPatterns)
      ) {
        throw new ConfigError(
          'WrapperStatements customPatterns must be an array',
        );
      }
    }
  }

  /**
   * 对AST进行数据库名改写
   * @param ast 解析后的AST
   * @returns 改写结果列表
   */
  rewriteAst(ast: AST | AST[]): DatabaseRewriteResult[] {
    if (!this.config.enabled) {
      return [];
    }

    const results: DatabaseRewriteResult[] = [];
    const astArray = Array.isArray(ast) ? ast : [ast];

    for (const singleAst of astArray) {
      this.processAstNode(singleAst, results);
    }

    return results;
  }

  /**
   * 处理单个AST节点
   */
  private processAstNode(ast: any, results: DatabaseRewriteResult[]): void {
    if (!ast || typeof ast !== 'object') {
      return;
    }

    // 处理FROM子句中的表引用
    if (ast.from && Array.isArray(ast.from)) {
      for (const fromItem of ast.from) {
        this.processFromItem(fromItem, results);
      }
    }

    // 处理INSERT语句中的表引用
    if (ast.table && Array.isArray(ast.table)) {
      for (const tableItem of ast.table) {
        this.processTableItem(tableItem, results);
      }
    }

    // 处理UPDATE语句中的表引用
    if (ast.table && !Array.isArray(ast.table)) {
      this.processTableItem(ast.table, results);
    }

    // 处理JOIN子句
    if (ast.from) {
      this.processJoins(ast.from, results);
    }

    // 处理子查询
    if (ast.with) {
      this.processWithClause(ast.with, results);
    }

    // 递归处理嵌套查询
    this.processNestedQueries(ast, results);
  }

  /**
   * 处理FROM子句中的表项
   */
  private processFromItem(
    fromItem: From,
    results: DatabaseRewriteResult[],
  ): void {
    if (!fromItem) return;

    // 处理不同类型的FROM项
    if ((fromItem as any).table && (fromItem as any).db) {
      // 正常情况：数据库名和表名分别解析
      const result = this.rewriteDatabaseName((fromItem as any).db);
      if (result.modified) {
        (fromItem as any).db = result.rewrittenName;
        results.push(result);
      }
    }

    // 处理JOIN和JOIN条件
    if ((fromItem as any).join) {
      // 递归处理JOIN的右表
      this.processFromItem((fromItem as any).join, results);

      // 处理JOIN条件（ON子句）
      if ((fromItem as any).on) {
        this.processJoinCondition((fromItem as any).on, results);
      }
    }
  }

  /**
   * 处理表项（INSERT/UPDATE中的表引用）
   */
  private processTableItem(
    tableItem: any,
    results: DatabaseRewriteResult[],
  ): void {
    if (!tableItem) return;

    if (tableItem.table && tableItem.db) {
      // 正常情况：数据库名和表名分别解析
      const result = this.rewriteDatabaseName(tableItem.db);
      if (result.modified) {
        tableItem.db = result.rewrittenName;
        results.push(result);
      }
    }
  }

  /**
   * 处理JOIN子句
   */
  private processJoins(
    fromItems: From[],
    results: DatabaseRewriteResult[],
  ): void {
    for (const fromItem of fromItems) {
      if ((fromItem as any).join) {
        this.processFromItem((fromItem as any).join, results);
      }
    }
  }

  /**
   * 处理WITH子句（CTE）
   */
  private processWithClause(
    withClause: any,
    results: DatabaseRewriteResult[],
  ): void {
    if (!withClause || !Array.isArray(withClause)) return;

    for (const cte of withClause) {
      if (cte.stmt) {
        // CTE的stmt包含ast属性，需要处理ast中的内容
        if (cte.stmt.ast) {
          this.processAstNode(cte.stmt.ast, results);
        } else {
          // 备用：直接处理stmt
          this.processAstNode(cte.stmt, results);
        }
      }
    }
  }

  /**
   * 处理嵌套查询
   */
  private processNestedQueries(
    ast: any,
    results: DatabaseRewriteResult[],
  ): void {
    // 处理WHERE子句中的子查询
    if (ast.where) {
      this.processWhereClause(ast.where, results);
    }

    // 处理SELECT子句中的子查询
    if (ast.columns && Array.isArray(ast.columns)) {
      for (const column of ast.columns) {
        if (column.expr && column.expr.ast) {
          this.processAstNode(column.expr.ast, results);
        }
      }
    }

    // 处理HAVING子句中的子查询
    if (ast.having) {
      this.processWhereClause(ast.having, results);
    }

    // 处理INSERT语句的SELECT部分
    if (ast.values && ast.values.type === 'select') {
      this.processAstNode(ast.values, results);
    }

    // 处理FROM子句中的子查询
    if (ast.from && Array.isArray(ast.from)) {
      for (const fromItem of ast.from) {
        if (fromItem.expr && fromItem.expr.ast) {
          this.processAstNode(fromItem.expr.ast, results);
        }
      }
    }

    // 暂时移除过于复杂的递归逻辑，避免堆栈溢出
    // this.processAllSubQueries(ast, results, new Set());
  }

  /**
   * 递归处理所有子查询
   */
  private processAllSubQueries(
    node: any,
    results: DatabaseRewriteResult[],
    visited: Set<any> = new Set(),
  ): void {
    if (!node || typeof node !== 'object' || visited.has(node)) return;
    visited.add(node);

    // 如果是子查询AST，直接处理
    if (
      node.type &&
      ['select', 'insert', 'update', 'delete'].includes(node.type)
    ) {
      this.processAstNode(node, results);
      return;
    }

    // 递归处理所有属性
    for (const key in node) {
      if (node.hasOwnProperty(key)) {
        const value = node[key];
        if (Array.isArray(value)) {
          for (const item of value) {
            this.processAllSubQueries(item, results, visited);
          }
        } else if (typeof value === 'object' && value !== null) {
          this.processAllSubQueries(value, results, visited);
        }
      }
    }
  }

  /**
   * 处理WHERE/HAVING子句
   */
  private processWhereClause(
    whereClause: any,
    results: DatabaseRewriteResult[],
  ): void {
    if (!whereClause) return;

    // 递归处理WHERE条件中的子查询
    if (whereClause.ast) {
      this.processAstNode(whereClause.ast, results);
    }

    // 处理函数类型（如EXISTS）中的子查询
    if (
      whereClause.type === 'function' &&
      whereClause.args &&
      whereClause.args.value
    ) {
      for (const arg of whereClause.args.value) {
        if (arg.ast && arg.ast.type) {
          this.processAstNode(arg.ast, results);
        }
      }
    }

    // 处理unary_expr类型（如NOT EXISTS）中的子查询
    if (whereClause.type === 'unary_expr' && whereClause.expr) {
      // 如果expr直接包含子查询AST
      if (whereClause.expr.ast && whereClause.expr.ast.type) {
        this.processAstNode(whereClause.expr.ast, results);
      }
      // 递归处理expr中的其他内容
      this.processWhereClause(whereClause.expr, results);
    }

    // 处理binary_expr类型（如IN）中的子查询
    if (whereClause.type === 'binary_expr') {
      // 处理右侧的表达式列表（如IN子查询）
      if (
        whereClause.right &&
        whereClause.right.type === 'expr_list' &&
        whereClause.right.value
      ) {
        for (const item of whereClause.right.value) {
          if (item.ast && item.ast.type) {
            this.processAstNode(item.ast, results);
          }
        }
      }
    }

    // 处理列引用中的数据库名
    this.processColumnRef(whereClause, results, new Set());

    // 处理左右操作数
    if (whereClause.left) {
      this.processWhereClause(whereClause.left, results);
    }
    if (whereClause.right) {
      this.processWhereClause(whereClause.right, results);
    }
  }

  /**
   * 处理JOIN条件（ON子句）
   */
  private processJoinCondition(
    condition: any,
    results: DatabaseRewriteResult[],
  ): void {
    if (!condition) return;

    // JOIN条件的处理逻辑与WHERE子句类似
    this.processWhereClause(condition, results);
  }

  /**
   * 处理列引用中的数据库名
   */
  private processColumnRef(
    node: any,
    results: DatabaseRewriteResult[],
    visited: Set<any> = new Set(),
  ): void {
    if (!node || typeof node !== 'object' || visited.has(node)) return;
    visited.add(node);

    // 处理列引用 (type: 'column_ref')
    if (node.type === 'column_ref' && node.db) {
      let dbName: string;

      // 处理不同格式的数据库名
      if (typeof node.db === 'string') {
        dbName = node.db;
      } else if (node.db.type === 'backticks_quote_string' && node.db.value) {
        dbName = node.db.value;
      } else if (node.db.type === 'single_quote_string' && node.db.value) {
        dbName = node.db.value;
      } else if (node.db.type === 'double_quote_string' && node.db.value) {
        dbName = node.db.value;
      } else {
        // 如果是其他格式，跳过处理
        dbName = null;
      }

      if (dbName) {
        const result = this.rewriteDatabaseName(dbName);
        if (result.modified) {
          // 保持原有的格式结构，只更新值
          if (typeof node.db === 'string') {
            node.db = result.rewrittenName;
          } else {
            node.db.value = result.rewrittenName;
          }
          results.push(result);
        }
      }
    }

    // 递归处理所有属性
    for (const key in node) {
      if (node.hasOwnProperty(key) && typeof node[key] === 'object') {
        if (Array.isArray(node[key])) {
          for (const item of node[key]) {
            this.processColumnRef(item, results, visited);
          }
        } else {
          this.processColumnRef(node[key], results, visited);
        }
      }
    }
  }

  /**
   * 改写单个数据库名
   * @param dbName 原始数据库名
   * @returns 改写结果
   */
  private rewriteDatabaseName(dbName: string): DatabaseRewriteResult {
    const originalName = dbName;

    // 检查是否已经包含前缀，避免重复添加
    if (this.config.dbPrefix && dbName.startsWith(this.config.dbPrefix)) {
      return {
        originalName,
        rewrittenName: dbName, // 已经有前缀，不需要改写
        modified: false,
      };
    }

    // 检查是否应该被排除
    if (this.shouldExcludeDatabase(dbName)) {
      return {
        originalName,
        rewrittenName: dbName,
        modified: false,
      };
    }

    // 检查是否是目标数据库（如果指定了目标列表）
    if (!this.isTargetDatabase(dbName)) {
      return {
        originalName,
        rewrittenName: dbName,
        modified: false,
      };
    }

    // 执行改写
    const rewrittenName = this.config.preserveOriginalName
      ? `${this.config.dbPrefix}${dbName}`
      : this.config.dbPrefix.replace(/\$\{original\}/g, dbName);

    return {
      originalName,
      rewrittenName,
      modified: rewrittenName !== originalName,
    };
  }

  /**
   * 检查数据库是否应该被排除
   */
  private shouldExcludeDatabase(dbName: string): boolean {
    if (
      !this.config.excludeDatabases ||
      this.config.excludeDatabases.length === 0
    ) {
      return false;
    }

    return this.config.excludeDatabases.includes(dbName);
  }

  /**
   * 检查是否是目标数据库
   */
  private isTargetDatabase(dbName: string): boolean {
    // 如果没有指定目标数据库列表，则默认所有数据库都是目标
    if (
      !this.config.targetDatabases ||
      this.config.targetDatabases.length === 0
    ) {
      return true;
    }

    return this.config.targetDatabases.includes(dbName);
  }

  /**
   * 获取当前配置
   */
  getConfig(): DatabaseRewriteConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<DatabaseRewriteConfig>): void {
    // 深度合并包装型语句配置
    if (newConfig.wrapperStatements) {
      this.config.wrapperStatements = {
        ...this.config.wrapperStatements,
        ...newConfig.wrapperStatements,
      };
    }

    const updatedConfig = { ...this.config, ...newConfig };
    this.validateConfig(updatedConfig);
    this.config = updatedConfig;
  }

  /**
   * 静态方法：创建数据库改写器实例
   */
  static create(config: DatabaseRewriteConfig): DatabaseNameRewriter {
    return new DatabaseNameRewriter(config);
  }

  /**
   * 静态方法：检查配置是否有效
   */
  static isValidConfig(config: any): config is DatabaseRewriteConfig {
    try {
      new DatabaseNameRewriter(config);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 对SQL语句进行数据库名改写，保留所有注释信息
   * @param sql SQL语句
   * @returns 改写结果
   */
  rewriteDatabase(sql: string): DatabaseRewriteOnlyResult {
    if (!this.config.enabled) {
      return {
        sql,
        modified: false,
        databaseRewrites: [],
      };
    }

    try {
      // 使用基类的模板方法来处理SQL
      const result = this.processWithComments(sql);

      return {
        sql: result.sql,
        modified: result.modified,
        databaseRewrites: result.result || [],
      };
    } catch (error) {
      // 改写失败时返回原SQL
      console.warn(
        'Database rewrite failed, returning original SQL:',
        error instanceof Error ? error.message : error,
      );
      return {
        sql,
        modified: false,
        databaseRewrites: [],
      };
    }
  }
}

```


> 代码路径  `src\errors.ts`

```typescript
/**
 * SQL解析错误基类
 */
export class SqlParseError extends Error {
  public readonly originalSql: string;
  public readonly cause?: Error;

  constructor(message: string, originalSql: string, cause?: Error) {
    super(message);
    this.name = 'SqlParseError';
    this.originalSql = originalSql;
    this.cause = cause;

    // 确保错误堆栈正确显示
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SqlParseError);
    }
  }
}

/**
 * Hint解析错误
 */
export class HintParseError extends SqlParseError {
  constructor(message: string, originalSql: string, cause?: Error) {
    super(`Hint解析失败: ${message}`, originalSql, cause);
    this.name = 'HintParseError';
  }
}

/**
 * AST转换错误
 */
export class AstTransformError extends SqlParseError {
  public readonly astType?: string;

  constructor(
    message: string,
    originalSql: string,
    astType?: string,
    cause?: Error,
  ) {
    super(`AST转换失败: ${message}`, originalSql, cause);
    this.name = 'AstTransformError';
    this.astType = astType;
  }
}

/**
 * SQL重写错误
 */
export class SqlRewriteError extends SqlParseError {
  constructor(message: string, originalSql: string, cause?: Error) {
    super(`SQL重写失败: ${message}`, originalSql, cause);
    this.name = 'SqlRewriteError';
  }
}

/**
 * 配置错误
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(`配置错误: ${message}`);
    this.name = 'ConfigError';
  }
}

/**
 * 不支持的SQL类型错误
 */
export class UnsupportedSqlError extends SqlParseError {
  public readonly sqlType: string;

  constructor(sqlType: string, originalSql: string) {
    super(`不支持的SQL类型: ${sqlType}`, originalSql);
    this.name = 'UnsupportedSqlError';
    this.sqlType = sqlType;
  }
}

/**
 * 错误工具函数
 */
export class ErrorUtils {
  /**
   * 格式化错误消息，包含完整的上下文信息
   */
  static formatError(error: SqlParseError): string {
    let message = `${error.name}: ${error.message}\n`;
    message += `原始SQL: ${error.originalSql.substring(0, 200)}${error.originalSql.length > 200 ? '...' : ''}\n`;

    if (error.cause) {
      message += `根本原因: ${error.cause.message}\n`;
    }

    return message;
  }

  /**
   * 检查是否为SQL解析相关错误
   */
  static isSqlParseError(error: unknown): error is SqlParseError {
    return error instanceof SqlParseError;
  }

  /**
   * 安全地获取错误消息
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

```


> 代码路径  `src\hint-parser.ts`

```typescript
import { HintInfo } from './types';
import { HintParseError } from './errors';

/**
 * Hint解析器
 * 负责从SQL注释中提取租户信息
 */
export class HintParser {
  // 匹配 /*& tenant:'xxx' */ 格式的hint
  private static readonly HINT_REGEX = /\/\*&\s*([^*]+)\s*\*\//g;
  // 匹配租户信息 tenant:'xxx' 或 tenant:"xxx"
  private static readonly TENANT_REGEX = /tenant\s*:\s*['"]([^'"]+)['"]/i;

  /**
   * 从SQL中提取hint信息
   * @param sql 原始SQL语句
   * @returns hint信息对象
   */
  static extractHint(sql: string): HintInfo {
    if (!sql || typeof sql !== 'string') {
      return {};
    }

    try {
      const hints = this.findAllHints(sql);

      if (hints.length === 0) {
        return {};
      }

      // 如果有多个hint，使用最后一个（按照SQL中出现的顺序）
      const lastHint = hints[hints.length - 1];
      const tenantMatch = this.TENANT_REGEX.exec(lastHint.content);

      if (!tenantMatch) {
        return { original: lastHint.original };
      }

      const tenant = tenantMatch[1].trim();
      if (!tenant) {
        throw new HintParseError('租户编码不能为空', sql);
      }

      return {
        tenant,
        original: lastHint.original,
      };
    } catch (error) {
      if (error instanceof HintParseError) {
        throw error;
      }
      throw new HintParseError(
        `解析hint时发生未知错误: ${error}`,
        sql,
        error as Error,
      );
    }
  }

  /**
   * 检查SQL是否包含hint
   * @param sql SQL语句
   * @returns 是否包含hint
   */
  static hasHint(sql: string): boolean {
    if (!sql || typeof sql !== 'string') {
      return false;
    }
    return this.HINT_REGEX.test(sql);
  }

  /**
   * 从SQL中移除所有hint注释
   * @param sql 原始SQL
   * @returns 移除hint后的SQL
   */
  static removeHints(sql: string): string {
    if (!sql || typeof sql !== 'string') {
      return sql;
    }
    return sql.replace(this.HINT_REGEX, '').trim();
  }

  /**
   * 从SQL中移除所有注释（包括hint和普通注释）
   * @param sql 原始SQL
   * @returns 移除注释后的SQL
   */
  static removeAllComments(sql: string): string {
    if (!sql || typeof sql !== 'string') {
      return sql;
    }

    // 移除多行注释 /* ... */
    let cleanSql = sql.replace(/\/\*[\s\S]*?\*\//g, '');

    // 移除单行注释 -- ...
    cleanSql = cleanSql.replace(/--.*$/gm, '');

    // 移除单行注释 # ...
    // cleanSql = cleanSql.replace(/#.*$/gm, '');

    return cleanSql.trim();
  }

  /**
   * 验证租户编码格式
   * @param tenant 租户编码
   * @returns 是否有效
   */
  static isValidTenant(tenant: string): boolean {
    if (!tenant || typeof tenant !== 'string') {
      return false;
    }

    // 租户编码应该只包含字母、数字、下划线和连字符
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(tenant.trim()) && tenant.trim().length > 0;
  }

  /**
   * 查找SQL中的所有hint
   * @param sql SQL语句
   * @returns hint列表
   */
  private static findAllHints(
    sql: string,
  ): Array<{ original: string; content: string }> {
    const hints: Array<{ original: string; content: string }> = [];
    let match;

    // 重置正则表达式的lastIndex
    this.HINT_REGEX.lastIndex = 0;

    while ((match = this.HINT_REGEX.exec(sql)) !== null) {
      const original = match[0];
      const content = match[1];
      hints.push({ original, content });
    }

    return hints;
  }

  /**
   * 构建hint字符串
   * @param tenant 租户编码
   * @returns hint字符串
   */
  static buildHint(tenant: string): string {
    if (!this.isValidTenant(tenant)) {
      throw new Error(`无效的租户编码: ${tenant}`);
    }
    return `/*& tenant:'${tenant.trim()}' */`;
  }

  /**
   * 规范化hint格式
   * @param hintContent hint内容（不包括注释符号部分）
   * @returns 规范化后的hint
   */
  static normalizeHint(hintContent: string): string {
    const tenantMatch = this.TENANT_REGEX.exec(hintContent);
    if (!tenantMatch) {
      throw new Error('无效的hint格式');
    }

    const tenant = tenantMatch[1].trim();
    return this.buildHint(tenant);
  }
}

```


> 代码路径  `src\index.ts`

```typescript
import { SqlRewriter } from './sql-rewriter';
import { HintParser } from './hint-parser';
import { DatabaseNameRewriter } from './database-name-rewriter';
import { SqlParserUtils } from './sql-parser-utils';
import { BaseSqlProcessor } from './base-sql-processor';
import {
  SqlParserConfig,
  HintInfo,
  RewriteResult,
  TenantCondition,
  SqlType,
  TargetDatabaseConfig,
  DatabaseRewriteConfig,
  DatabaseRewriteResult,
  DatabaseRewriteOnlyResult,
  WrapperStatementConfig,
  WrapperInfo,
} from './types';
import {
  SqlParseError,
  HintParseError,
  AstTransformError,
  SqlRewriteError,
  ConfigError,
  UnsupportedSqlError,
  ErrorUtils,
} from './errors';

/**
 * Global configuration
 */
let globalConfig: SqlParserConfig = {
  tenantField: 'tenant',
  database: 'mysql',
  throwOnError: true,
  targetDatabases: {
    prefixes: ['tnt_'],
    fullNames: ['global_mb'],
    defaultDatabase: 'main', // 默认库名，可根据实际情况调整
  },
};

/**
 * Global SQL rewriter instance (延迟初始化避免重复创建)
 */
let globalRewriter: SqlRewriter | null = null;

/**
 * 获取或创建全局 SqlRewriter 实例
 */
function getGlobalRewriter(): SqlRewriter {
  if (!globalRewriter) {
    globalRewriter = new SqlRewriter(globalConfig);
  }
  return globalRewriter;
}

/**
 * SQL Parser Service
 * Provides simple static method interface
 */
export class SqlParserService {
  /**
   * Set global tenant field name
   * @param fieldName tenant field name
   */
  static setTenantField(fieldName: string): void {
    if (
      !fieldName ||
      typeof fieldName !== 'string' ||
      fieldName.trim().length === 0
    ) {
      throw new ConfigError('Tenant field name cannot be empty');
    }

    globalConfig.tenantField = fieldName.trim();
    if (globalRewriter) {
      globalRewriter.updateConfig({ tenantField: globalConfig.tenantField });
    }
  }

  /**
   * Set target databases configuration
   * @param targetDatabases target database configuration
   */
  static setTargetDatabases(targetDatabases: TargetDatabaseConfig): void {
    if (!targetDatabases) {
      throw new ConfigError('Target databases configuration cannot be empty');
    }

    globalConfig.targetDatabases = targetDatabases;
    if (globalRewriter) {
      globalRewriter.updateConfig({
        targetDatabases: globalConfig.targetDatabases,
      });
    }
  }

  /**
   * Add database prefix to target list
   * @param prefix database prefix
   */
  static addDatabasePrefix(prefix: string): void {
    if (!prefix || typeof prefix !== 'string' || prefix.trim().length === 0) {
      throw new ConfigError('Database prefix cannot be empty');
    }

    if (!globalConfig.targetDatabases) {
      globalConfig.targetDatabases = {
        prefixes: [],
        fullNames: [],
        defaultDatabase: 'main',
      };
    }

    const trimmedPrefix = prefix.trim();
    if (!globalConfig.targetDatabases.prefixes.includes(trimmedPrefix)) {
      globalConfig.targetDatabases.prefixes.push(trimmedPrefix);
      if (globalRewriter) {
        globalRewriter.updateConfig({
          targetDatabases: globalConfig.targetDatabases,
        });
      }
    }
  }

  /**
   * Add full database name to target list
   * @param dbName full database name
   */
  static addDatabaseName(dbName: string): void {
    if (!dbName || typeof dbName !== 'string' || dbName.trim().length === 0) {
      throw new ConfigError('Database name cannot be empty');
    }

    if (!globalConfig.targetDatabases) {
      globalConfig.targetDatabases = {
        prefixes: [],
        fullNames: [],
        defaultDatabase: 'main',
      };
    }

    const trimmedDbName = dbName.trim();
    if (!globalConfig.targetDatabases.fullNames.includes(trimmedDbName)) {
      globalConfig.targetDatabases.fullNames.push(trimmedDbName);
      if (globalRewriter) {
        globalRewriter.updateConfig({
          targetDatabases: globalConfig.targetDatabases,
        });
      }
    }
  }

  /**
   * Set default database name for tables without database prefix
   * @param defaultDatabase default database name
   */
  static setDefaultDatabase(defaultDatabase: string): void {
    if (
      !defaultDatabase ||
      typeof defaultDatabase !== 'string' ||
      defaultDatabase.trim().length === 0
    ) {
      throw new ConfigError('Default database name cannot be empty');
    }

    if (!globalConfig.targetDatabases) {
      globalConfig.targetDatabases = {
        prefixes: [],
        fullNames: [],
        defaultDatabase: defaultDatabase.trim(),
      };
    } else {
      globalConfig.targetDatabases.defaultDatabase = defaultDatabase.trim();
    }

    if (globalRewriter) {
      globalRewriter.updateConfig({
        targetDatabases: globalConfig.targetDatabases,
      });
    }
  }

  /**
   * Set global configuration
   * @param config configuration object
   */
  static setConfig(config: Partial<SqlParserConfig>): void {
    globalConfig = { ...globalConfig, ...config };
    // 重置全局实例，让其在下次使用时重新创建
    globalRewriter = null;
  }

  /**
   * Get current global configuration
   * @returns current configuration
   */
  static getConfig(): SqlParserConfig {
    return { ...globalConfig };
  }

  /**
   * Rewrite SQL with tenant filtering conditions
   * @param sql original SQL statement
   * @returns rewritten SQL
   */
  static rewriteWithTenant(sql: string): string {
    const result = getGlobalRewriter().rewrite(sql);
    return result.sql;
  }

  /**
   * Rewrite SQL and return detailed results
   * @param sql original SQL statement
   * @returns detailed rewrite results
   */
  static rewriteWithDetails(sql: string): RewriteResult {
    return getGlobalRewriter().rewrite(sql);
  }

  /**
   * Batch rewrite SQLs
   * @param sqlList SQL statement list
   * @returns rewritten SQL list
   */
  static batchRewrite(sqlList: string[]): string[] {
    const results = getGlobalRewriter().batchRewrite(sqlList);
    return results.map((result) => result.sql);
  }

  /**
   * Batch rewrite SQLs and return detailed results
   * @param sqlList SQL statement list
   * @returns detailed rewrite results list
   */
  static batchRewriteWithDetails(sqlList: string[]): RewriteResult[] {
    return getGlobalRewriter().batchRewrite(sqlList);
  }

  /**
   * Extract hint information from SQL
   * @param sql SQL statement
   * @returns hint information
   */
  static extractHint(sql: string): HintInfo {
    return getGlobalRewriter().extractHint(sql);
  }

  /**
   * Check if SQL contains hint
   * @param sql SQL statement
   * @returns whether contains hint
   */
  static hasHint(sql: string): boolean {
    return getGlobalRewriter().hasHint(sql);
  }

  /**
   * Remove all hints from SQL
   * @param sql SQL statement
   * @returns SQL without hints
   */
  static removeHints(sql: string): string {
    return getGlobalRewriter().removeHints(sql);
  }

  /**
   * Remove all comments from SQL
   * @param sql SQL statement
   * @returns SQL without comments
   */
  static removeAllComments(sql: string): string {
    return HintParser.removeAllComments(sql);
  }

  /**
   * Validate if SQL is valid
   * @param sql SQL statement
   * @returns whether valid
   */
  static validateSql(sql: string): boolean {
    return getGlobalRewriter().validateSql(sql);
  }

  /**
   * Get SQL type
   * @param sql SQL statement
   * @returns SQL type
   */
  static getSqlType(sql: string): SqlType | null {
    return getGlobalRewriter().getSqlType(sql);
  }

  /**
   * Get detailed SQL information (for debugging)
   * @param sql SQL statement
   * @returns detailed information
   */
  static getDetailedInfo(sql: string): {
    hasHint: boolean;
    hint: HintInfo;
    sqlType: SqlType | null;
    isValid: boolean;
    cleanSql: string;
  } {
    return getGlobalRewriter().getDetailedSqlInfo(sql);
  }

  /**
   * Create tenant hint
   * @param tenant tenant code
   * @returns hint string
   */
  static createHint(tenant: string): string {
    return SqlRewriter.createHint(tenant);
  }

  /**
   * Add hint to SQL
   * @param sql original SQL
   * @param tenant tenant code
   * @returns SQL with hint
   */
  static addHintToSql(sql: string, tenant: string): string {
    return SqlRewriter.addHintToSql(sql, tenant);
  }

  /**
   * Validate tenant code format
   * @param tenant tenant code
   * @returns whether valid
   */
  static isValidTenant(tenant: string): boolean {
    return HintParser.isValidTenant(tenant);
  }

  /**
   * Create new SQL rewriter instance (for independent configuration)
   * @param config configuration
   * @returns SQL rewriter instance
   */
  static createRewriter(config?: Partial<SqlParserConfig>): SqlRewriter {
    return new SqlRewriter(config);
  }
}

/**
 * Export types and error classes
 */
export {
  // Core classes
  SqlRewriter,
  HintParser,
  DatabaseNameRewriter,

  // New infrastructure classes
  SqlParserUtils,
  BaseSqlProcessor,

  // Type definitions
  SqlParserConfig,
  TargetDatabaseConfig,
  DatabaseRewriteConfig,
  DatabaseRewriteResult,
  DatabaseRewriteOnlyResult,
  WrapperStatementConfig,
  WrapperInfo,
  HintInfo,
  RewriteResult,
  TenantCondition,
  SqlType,

  // Error classes
  SqlParseError,
  HintParseError,
  AstTransformError,
  SqlRewriteError,
  ConfigError,
  UnsupportedSqlError,
  ErrorUtils,
};

/**
 * Default export main service class
 */
export default SqlParserService;

/**
 * Convenient function exports (backward compatibility)
 */

/**
 * Rewrite SQL statement with tenant filtering conditions
 * @param sql original SQL
 * @returns rewritten SQL
 */
export const rewriteWithTenant = SqlParserService.rewriteWithTenant;

/**
 * Extract hint information
 * @param sql SQL statement
 * @returns hint information
 */
export const extractHint = SqlParserService.extractHint;

/**
 * Remove hints from SQL
 * @param sql SQL statement
 * @returns SQL without hints
 */
export const removeHints = SqlParserService.removeHints;

/**
 * Set global tenant field name
 * @param fieldName field name
 */
export const setTenantField = SqlParserService.setTenantField;

/**
 * Library version information
 */
export const version = '1.0.0-beta.1';

```


> 代码路径  `src\sql-parser-utils.ts`

```typescript
import { Parser, AST } from 'node-sql-parser';
import { CommentInfo, WrapperStatementConfig, WrapperInfo } from './types';
import { SqlParseError, SqlRewriteError, ErrorUtils } from './errors';

/**
 * SQL解析工具类
 * 提供通用的SQL处理功能，供SqlRewriter和DatabaseNameRewriter共用
 */
export class SqlParserUtils {
  private static parser = new Parser();

  /**
   * 预处理 DEFAULT 值
   * 将 DEFAULT 关键字替换为占位符，因为 node-sql-parser 不支持 DEFAULT
   * @param sql 原始SQL
   * @returns 预处理后的SQL
   */
  static preprocessDefaultValues(sql: string): string {
    // 使用不太可能与实际数据冲突的占位符
    return sql.replace(/\bDEFAULT\b/gi, "'__SQL_PARSER_DEFAULT_PLACEHOLDER__'");
  }

  /**
   * 后处理恢复 DEFAULT 值
   * 将占位符恢复为 DEFAULT 关键字
   * @param sql 处理后的SQL
   * @returns 恢复DEFAULT关键字的SQL
   */
  static postprocessDefaultValues(sql: string): string {
    // 恢复 DEFAULT 关键字
    return sql.replace(/'__SQL_PARSER_DEFAULT_PLACEHOLDER__'/g, 'DEFAULT');
  }

  /**
   * 提取SQL中的所有注释
   * @param sql 原始SQL
   * @returns 注释信息数组
   */
  static extractAllComments(sql: string): CommentInfo[] {
    const comments: CommentInfo[] = [];

    // 匹配块注释 /* ... */
    const blockCommentRegex = /\/\*[\s\S]*?\*\//g;
    let match;

    while ((match = blockCommentRegex.exec(sql)) !== null) {
      comments.push({
        content: match[0],
        type: 'block',
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // 匹配行注释 -- ... (到行末)
    const lineCommentRegex = /--.*$/gm;
    while ((match = lineCommentRegex.exec(sql)) !== null) {
      comments.push({
        content: match[0],
        type: 'line',
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // 匹配行注释 # ... (到行末)
    // const hashCommentRegex = /#.*$/gm;
    // while ((match = hashCommentRegex.exec(sql)) !== null) {
    //   comments.push({
    //     content: match[0],
    //     type: 'line',
    //     start: match.index,
    //     end: match.index + match[0].length,
    //   });
    // }

    // 按位置排序
    return comments.sort((a, b) => a.start - b.start);
  }

  /**
   * 将注释和纯SQL重新组合
   * @param comments 注释信息数组
   * @param cleanSql 纯SQL
   * @returns 组合后的完整SQL
   */
  static combineCommentsAndSql(
    comments: CommentInfo[],
    cleanSql: string,
  ): string {
    if (comments.length === 0) {
      return cleanSql;
    }

    // 简单策略：将所有注释放在SQL前面，用空格分隔
    const commentStrings = comments.map((comment) => comment.content);
    return `${commentStrings.join(' ')} ${cleanSql}`;
  }

  /**
   * 解析SQL为AST
   * @param sql SQL语句
   * @param database 数据库类型，默认为mysql
   * @returns 解析后的AST
   */
  static parseToAst(sql: string, database = 'mysql'): AST | AST[] {
    try {
      // 预处理 DEFAULT 值
      const preprocessedSql = SqlParserUtils.preprocessDefaultValues(sql);

      return SqlParserUtils.parser.astify(preprocessedSql, {
        database,
      });
    } catch (error) {
      throw new SqlParseError(
        `SQL解析失败: ${ErrorUtils.getErrorMessage(error)}`,
        sql,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 将AST转换为SQL
   * @param ast AST对象
   * @param database 数据库类型，默认为mysql
   * @returns 转换后的SQL
   */
  static astToSql(ast: AST | AST[], database = 'mysql'): string {
    try {
      const sql = SqlParserUtils.parser.sqlify(ast, {
        database,
      });

      // 恢复 DEFAULT 值
      return SqlParserUtils.postprocessDefaultValues(sql);
    } catch (error) {
      throw new SqlRewriteError(
        `AST转SQL失败: ${ErrorUtils.getErrorMessage(error)}`,
        JSON.stringify(ast),
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 验证SQL类型是否支持
   * @param ast 解析后的AST
   * @param supportedTypes 支持的SQL类型数组
   * @param originalSql 原始SQL（用于错误信息）
   * @param throwOnUnsupported 遇到不支持的类型是否抛出异常，默认为false（仅警告）
   */
  static validateSqlType(
    ast: AST | AST[],
    supportedTypes: string[],
    originalSql?: string,
    throwOnUnsupported = false,
  ): void {
    const astArray = Array.isArray(ast) ? ast : [ast];

    for (const astItem of astArray) {
      if (!supportedTypes.includes(astItem.type)) {
        const message = `SQL type '${astItem.type}' is not supported. Supported types: ${supportedTypes.join(', ')}`;

        if (throwOnUnsupported) {
          throw new SqlRewriteError(message, originalSql || '');
        } else {
          console.warn(message);
        }
      }
    }
  }

  /**
   * 安全的SQL解析，失败时返回null而不抛出异常
   * @param sql SQL语句
   * @param database 数据库类型
   * @returns 解析成功返回AST，失败返回null
   */
  static safeParseToAst(sql: string, database = 'mysql'): AST | AST[] | null {
    try {
      return SqlParserUtils.parseToAst(sql, database);
    } catch {
      return null;
    }
  }

  /**
   * 安全的AST转SQL，失败时返回原始输入
   * @param ast AST对象
   * @param database 数据库类型
   * @param fallbackSql 失败时的降级SQL
   * @returns 转换后的SQL或降级SQL
   */
  static safeAstToSql(
    ast: AST | AST[],
    database = 'mysql',
    fallbackSql = '',
  ): string {
    try {
      return SqlParserUtils.astToSql(ast, database);
    } catch {
      return fallbackSql;
    }
  }

  /**
   * 检查SQL是否可以被正确解析
   * @param sql SQL语句
   * @param database 数据库类型
   * @returns 是否可以解析
   */
  static isValidSql(sql: string, database = 'mysql'): boolean {
    return SqlParserUtils.safeParseToAst(sql, database) !== null;
  }

  /**
   * 获取SQL的类型
   * @param sql SQL语句
   * @param database 数据库类型
   * @returns SQL类型或null（解析失败时）
   */
  static getSqlType(sql: string, database = 'mysql'): string | null {
    const ast = SqlParserUtils.safeParseToAst(sql, database);
    if (!ast) {
      return null;
    }

    if (Array.isArray(ast)) {
      return ast.length > 0 ? ast[0].type : null;
    }

    return ast.type;
  }

  /**
   * 移除SQL中的所有注释，返回纯SQL
   * @param sql 原始SQL
   * @returns 移除注释后的SQL
   */
  static removeAllComments(sql: string): string {
    return (
      sql
        .replace(/\/\*[\s\S]*?\*\//g, ' ') // 移除块注释
        .replace(/--.*$/gm, '') // 移除行注释 --
        // .replace(/#.*$/gm, '') // 移除行注释 #
        .replace(/\s+/g, ' ') // 合并多个空格
        .trim()
    );
  }

  /**
   * 完整的SQL处理流程模板
   * 包含注释提取、预处理、解析、处理、转换、后处理、注释组合的完整流程
   * @param sql 原始SQL
   * @param processor AST处理函数
   * @param database 数据库类型
   * @param supportedTypes 支持的SQL类型
   * @returns 处理结果
   */
  static processWithTemplate<T>(
    sql: string,
    processor: (ast: AST | AST[]) => T,
    database = 'mysql',
    supportedTypes: string[] = [
      'select',
      'insert',
      'replace',
      'update',
      'delete',
    ],
  ): {
    result: T | null;
    finalSql: string;
    modified: boolean;
    comments: CommentInfo[];
  } {
    // 1. 提取注释
    let allComments: CommentInfo[] = [];
    let cleanSql: string = sql;

    try {
      allComments = SqlParserUtils.extractAllComments(sql);
      cleanSql = SqlParserUtils.removeAllComments(sql);
    } catch (error) {
      console.warn(
        '提取注释失败，使用原始SQL:',
        ErrorUtils.getErrorMessage(error),
      );
    }

    try {
      // 2. 解析AST
      const ast = SqlParserUtils.parseToAst(cleanSql, database);

      // 3. 验证SQL类型
      SqlParserUtils.validateSqlType(ast, supportedTypes, cleanSql, false);

      // 4. 执行处理
      const result = processor(ast);

      // 5. 转换回SQL
      const processedSql = SqlParserUtils.astToSql(ast, database);

      // 6. 组合注释
      const finalSql =
        allComments.length > 0
          ? SqlParserUtils.combineCommentsAndSql(allComments, processedSql)
          : processedSql;

      return {
        result,
        finalSql,
        modified: processedSql !== cleanSql.trim(),
        comments: allComments,
      };
    } catch (error) {
      console.warn(
        'SQL处理失败，返回原SQL:',
        ErrorUtils.getErrorMessage(error),
      );

      const finalSql =
        allComments.length > 0
          ? SqlParserUtils.combineCommentsAndSql(allComments, cleanSql)
          : sql;

      return {
        result: null,
        finalSql,
        modified: false,
        comments: allComments,
      };
    }
  }

  /**
   * 增强的包装型语句预处理，支持配置驱动
   * @param sql 原始SQL语句
   * @param config 包装型语句配置
   * @returns 包装型语句信息
   */
  static preprocessWrapperStatements(
    sql: string,
    config?: WrapperStatementConfig,
  ): WrapperInfo {
    const trimmedSql = sql.trim();

    // 如果未启用或无配置，直接返回
    if (!config?.enabled) {
      return {
        hasWrapper: false,
        wrapperType: '',
        prefix: '',
        innerSql: trimmedSql,
        originalSql: trimmedSql,
      };
    }

    // 先移除所有注释以便进行包装型语句模式匹配
    // 但保留原始SQL用于后续处理
    let sqlForMatching: string;
    try {
      sqlForMatching = SqlParserUtils.removeAllComments(trimmedSql).trim();
    } catch (error) {
      // 注释移除失败，使用原始SQL
      console.warn(
        '移除注释失败，使用原始SQL进行包装型语句匹配:',
        ErrorUtils.getErrorMessage(error),
      );
      sqlForMatching = trimmedSql;
    }

    // 默认的包装型语句模式
    const defaultPatterns = [
      {
        type: 'EXPLAIN',
        pattern: /^(EXPLAIN\s+)(.+)$/i,
        validateInner: (innerSql: string) => {
          return /^\s*(SELECT|INSERT|UPDATE|DELETE|REPLACE|WITH)\s+/i.test(
            innerSql,
          );
        },
      },
    ];

    // 合并自定义模式
    const allPatterns = [...defaultPatterns, ...(config.customPatterns || [])];

    // 只处理配置中启用的类型
    const enabledPatterns = allPatterns.filter((pattern) =>
      config.supportedTypes.includes(pattern.type),
    );

    // 尝试匹配（使用移除了注释的SQL）
    for (const wrapper of enabledPatterns) {
      const match = sqlForMatching.match(wrapper.pattern);
      if (match) {
        const cleanInnerSql = match[2] || match[1];

        // 验证内层SQL（如果启用验证）
        if (config.validateInnerSql !== false) {
          const isValidInner = wrapper.validateInner
            ? wrapper.validateInner(cleanInnerSql)
            : true;

          if (!isValidInner) {
            console.warn(
              `包装型语句 ${wrapper.type} 的内层SQL验证失败: ${cleanInnerSql.substring(0, 50)}...`,
            );
            continue; // 内层SQL无效，继续尝试下一个模式
          }
        }

        // 从原始SQL（包含注释的）中提取内层SQL
        // 需要找到包装型语句前缀在原始SQL中的位置
        const wrapperPrefix = match[1]; // 例如 "EXPLAIN "

        // 在原始SQL中查找包装型语句前缀的位置（忽略大小写）
        const regex = new RegExp(`(${wrapperPrefix.trim()})\\s+`, 'i');
        const originalMatch = trimmedSql.match(regex);

        if (originalMatch) {
          // 计算包装前缀在原始SQL中的结束位置
          const prefixEndIndex = originalMatch.index! + originalMatch[0].length;
          // 提取从前缀结束位置到SQL结尾的部分作为内层SQL
          const innerSqlFromOriginal = trimmedSql.substring(prefixEndIndex);

          return {
            hasWrapper: true,
            wrapperType: wrapper.type,
            prefix: originalMatch[0], // 使用原始SQL中的前缀（可能包含不同的空格格式）
            innerSql: innerSqlFromOriginal,
            originalSql: trimmedSql,
          };
        } else {
          // 如果在原始SQL中找不到前缀，回退到使用清理后的SQL
          console.warn(`在原始SQL中找不到包装型语句前缀: ${wrapperPrefix}`);
          return {
            hasWrapper: true,
            wrapperType: wrapper.type,
            prefix: wrapperPrefix,
            innerSql: cleanInnerSql,
            originalSql: trimmedSql,
          };
        }
      }
    }

    return {
      hasWrapper: false,
      wrapperType: '',
      prefix: '',
      innerSql: trimmedSql,
      originalSql: trimmedSql,
    };
  }

  /**
   * 包装型语句后处理：重新组装完整语句
   * @param processedSql 处理后的内层SQL
   * @param wrapperInfo 包装型语句信息
   * @returns 重新组装的完整SQL
   */
  static postprocessWrapperStatements(
    processedSql: string,
    wrapperInfo: WrapperInfo,
  ): string {
    if (!wrapperInfo.hasWrapper) {
      return processedSql;
    }
    return `${wrapperInfo.prefix}${processedSql}`;
  }
}

```


> 代码路径  `src\sql-rewriter.ts`

```typescript
import { AST } from 'node-sql-parser';
import { HintParser } from './hint-parser';
import { AstTransformer } from './ast-transformer';
import { BaseSqlProcessor } from './base-sql-processor';
import { SqlParserUtils } from './sql-parser-utils';
import {
  SqlParserConfig,
  HintInfo,
  RewriteResult,
  TenantCondition,
  SqlType,
  TargetDatabaseConfig,
} from './types';
import { SqlRewriteError, ErrorUtils } from './errors';

/**
 * SQL改写器
 * 协调各个模块完成SQL的解析、转换和重写
 * 现在继承BaseSqlProcessor来复用通用功能
 */
export class SqlRewriter extends BaseSqlProcessor {
  private config: SqlParserConfig;

  constructor(config: Partial<SqlParserConfig> = {}) {
    super();

    // 默认配置
    const defaultConfig: SqlParserConfig = {
      tenantField: 'tenant',
      database: 'mysql',
      throwOnError: true,
      targetDatabases: {
        prefixes: [],
        fullNames: [],
        defaultDatabase: 'main',
      },
      // 默认包装型语句配置
      wrapperStatements: {
        enabled: false, // 默认关闭，需要显式启用
        supportedTypes: [],
        validateInnerSql: true,
      },
    };

    // 深度合并配置，避免覆盖问题
    this.config = {
      ...defaultConfig,
      ...config,
      // 深度合并嵌套对象
      targetDatabases: {
        ...defaultConfig.targetDatabases,
        ...(config.targetDatabases || {}),
      },
      wrapperStatements: {
        ...defaultConfig.wrapperStatements,
        ...(config.wrapperStatements || {}),
      },
    };
    // console.log('SqlRewriter finalConfig', this.config);
  }

  /**
   * 实现BaseSqlProcessor的抽象方法：获取支持的SQL类型
   */
  protected getSupportedSqlTypes(): string[] {
    return ['select', 'insert', 'replace', 'update', 'delete'];
  }

  /**
   * 实现BaseSqlProcessor的抽象方法：获取数据库类型
   */
  protected getDatabase(): string {
    return this.config.database;
  }

  /**
   * 实现BaseSqlProcessor的抽象方法：是否在遇到不支持的SQL类型时抛出异常
   */
  protected shouldThrowOnUnsupportedType(): boolean {
    return this.config.throwOnError;
  }

  /**
   * 实现BaseSqlProcessor的抽象方法：处理AST
   * 执行租户条件添加
   */
  protected processAst(ast: AST | AST[]): TenantCondition | null {
    // 暂时返回null，租户条件添加逻辑在rewrite方法中专门处理
    return null;
  }

  /**
   * 重写基类方法：是否支持包装型语句
   */
  protected supportWrapperStatements(): boolean {
    return this.config.wrapperStatements?.enabled ?? false;
  }

  /**
   * 重写基类方法：获取包装型语句配置
   */
  protected getWrapperStatementsConfig() {
    return this.config.wrapperStatements;
  }

  /**
   * 重写基类方法：获取支持的包装型语句类型
   */
  protected getSupportedWrapperTypes(): string[] {
    if (!this.config.wrapperStatements?.enabled) {
      return [];
    }
    return this.config.wrapperStatements.supportedTypes || ['EXPLAIN'];
  }

  /**
   * 重写SQL，添加租户过滤条件
   * 采用容错处理，保留所有原始注释信息
   * @param sql 原始SQL语句
   * @returns 重写结果
   */
  rewrite(sql: string): RewriteResult {
    // 输入验证
    try {
      this.validateInput(sql);
    } catch (error) {
      if (this.config.throwOnError) {
        throw error;
      }
      // 输入无效时，返回原始输入和空hint
      return { sql, modified: false, hint: {} };
    }

    // 提取hint信息
    let hint: HintInfo = {};
    try {
      hint = HintParser.extractHint(sql);
    } catch (error) {
      console.warn(
        '提取hint失败，继续处理:',
        ErrorUtils.getErrorMessage(error),
      );
      // hint 提取失败，保持为空对象，但继续处理
    }

    // 没有租户信息时的处理
    if (!hint.tenant) {
      // 使用基类的方法处理包装型语句，但不进行租户条件修改
      const result = this.processWithComments(sql);
      return { sql: result.sql, modified: result.modified, hint };
    }

    // 有租户信息时，进行SQL改写
    try {
      // 如果启用了包装型语句支持，需要特殊处理
      if (this.supportWrapperStatements()) {
        // 使用包装型语句预处理
        const wrapperConfig = this.getWrapperStatementsConfig();
        if (wrapperConfig) {
          const wrapperInfo = SqlParserUtils.preprocessWrapperStatements(
            sql,
            wrapperConfig,
          );

          if (wrapperInfo.hasWrapper) {
            // 处理包装型语句：对内层SQL进行改写
            // wrapperInfo.innerSql 已经是纯净的内层SQL，不包含EXPLAIN前缀
            const rewrittenInnerSql = this.rewriteCleanSql(
              wrapperInfo.innerSql,
              hint.tenant,
            );

            // 重新组合：先组合注释和内层SQL，再加上包装前缀
            const allComments = SqlParserUtils.extractAllComments(sql);
            const sqlWithComments =
              allComments.length > 0
                ? SqlParserUtils.combineCommentsAndSql(
                    allComments,
                    rewrittenInnerSql,
                  )
                : rewrittenInnerSql;

            const finalSql = SqlParserUtils.postprocessWrapperStatements(
              sqlWithComments,
              wrapperInfo,
            );

            return {
              sql: finalSql,
              modified: rewrittenInnerSql !== wrapperInfo.innerSql.trim(),
              hint,
            };
          }
        }
      }

      // 非包装型语句的正常处理
      const cleanSql = HintParser.removeAllComments(sql);
      const rewrittenCleanSql = this.rewriteCleanSql(cleanSql, hint.tenant);

      if (rewrittenCleanSql === cleanSql.trim()) {
        // 没有实际改写
        return { sql, modified: false, hint };
      }

      // 改写成功，组合注释
      const allComments = SqlParserUtils.extractAllComments(sql);
      const finalSql =
        allComments.length > 0
          ? SqlParserUtils.combineCommentsAndSql(allComments, rewrittenCleanSql)
          : rewrittenCleanSql;

      return { sql: finalSql, modified: true, hint };
    } catch (rewriteError) {
      if (this.config.throwOnError) {
        throw rewriteError;
      }

      // SQL改写失败，返回原始完整SQL和提取到的hint
      console.warn(
        'SQL重写失败，返回原SQL:',
        ErrorUtils.getErrorMessage(rewriteError),
      );

      return { sql, modified: false, hint };
    }
  }

  /**
   * 转写纯SQL（不包含hint），添加租户过滤条件
   * @param cleanSql 纯SQL语句（不包含hint）
   * @param tenant 租户标识
   * @returns 转写后的SQL
   */
  rewriteCleanSql(cleanSql: string, tenant: string): string {
    try {
      // 1. 解析SQL为AST（使用工具类，包含DEFAULT预处理）
      const ast = SqlParserUtils.parseToAst(cleanSql, this.config.database);

      // 2. 验证SQL类型是否支持
      SqlParserUtils.validateSqlType(
        ast,
        this.getSupportedSqlTypes(),
        cleanSql,
        this.shouldThrowOnUnsupportedType(),
      );

      // 3. 只执行租户条件添加（不进行数据库名改写）
      const tenantCondition = { field: this.config.tenantField, value: tenant };
      const modifiedAst = AstTransformer.transform(
        ast,
        tenantCondition,
        this.config.targetDatabases,
      );

      // 4. 将AST转换回SQL（使用工具类，包含DEFAULT后处理）
      return SqlParserUtils.astToSql(modifiedAst, this.config.database);
    } catch (error) {
      if (this.config.throwOnError) {
        throw error;
      }
      // 转写失败时返回原SQL
      return cleanSql;
    }
  }

  /**
   * 批量重写SQL
   * @param sqlList SQL列表
   * @returns 重写结果列表
   */
  batchRewrite(sqlList: string[]): RewriteResult[] {
    return sqlList.map((sql) => {
      try {
        return this.rewrite(sql);
      } catch (error) {
        if (this.config.throwOnError) {
          throw error;
        }
        return {
          sql: sql,
          modified: false,
          hint: HintParser.extractHint(sql),
        };
      }
    });
  }

  /**
   * 批量转写纯SQL（不包含hint）
   * @param cleanSqlList 纯SQL列表
   * @param tenant 租户标识
   * @returns 转写后的SQL列表
   */
  batchRewriteCleanSql(cleanSqlList: string[], tenant: string): string[] {
    return cleanSqlList.map((cleanSql) => {
      return this.rewriteCleanSql(cleanSql, tenant);
    });
  }

  /**
   * 仅提取hint信息，不进行重写
   * @param sql SQL语句
   * @returns hint信息
   */
  extractHint(sql: string): HintInfo {
    return HintParser.extractHint(sql);
  }

  /**
   * 检查SQL是否包含hint
   * @param sql SQL语句
   * @returns 是否包含hint
   */
  hasHint(sql: string): boolean {
    return HintParser.hasHint(sql);
  }

  /**
   * 移除SQL中的hint
   * @param sql SQL语句
   * @returns 移除hint后的SQL
   */
  removeHints(sql: string): string {
    return HintParser.removeHints(sql);
  }

  /**
   * 验证SQL是否可以被正确解析
   * @param sql SQL语句
   * @returns 是否有效
   */
  validateSql(sql: string): boolean {
    const cleanSql = HintParser.removeHints(sql);
    return SqlParserUtils.isValidSql(cleanSql, this.config.database);
  }

  /**
   * 获取SQL类型
   * @param sql SQL语句
   * @returns SQL类型
   */
  getSqlType(sql: string): SqlType | null {
    const cleanSql = HintParser.removeHints(sql);
    return SqlParserUtils.getSqlType(
      cleanSql,
      this.config.database,
    ) as SqlType | null;
  }

  /**
   * 更新配置
   * @param newConfig 新配置（部分更新）
   */
  updateConfig(newConfig: Partial<SqlParserConfig>): void {
    // 深度合并包装型语句配置
    if (newConfig.wrapperStatements) {
      this.config.wrapperStatements = {
        ...this.config.wrapperStatements,
        ...newConfig.wrapperStatements,
      };
    }

    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   * @returns 当前配置
   */
  getConfig(): SqlParserConfig {
    return { ...this.config };
  }

  /**
   * 验证输入参数
   */
  private validateInput(sql: string): void {
    if (!sql || typeof sql !== 'string') {
      throw new SqlRewriteError('SQL语句不能为空', sql || '');
    }

    if (sql.trim().length === 0) {
      throw new SqlRewriteError('SQL语句不能为空字符串', sql);
    }
  }

  /**
   * 获取详细的错误信息（用于调试）
   * SqlRewriter特有的方法，增加了hint相关信息
   * @param sql SQL语句
   * @returns 详细信息
   */
  getDetailedSqlInfo(sql: string): {
    hasHint: boolean;
    hint: HintInfo;
    sqlType: SqlType | null;
    isValid: boolean;
    cleanSql: string;
  } {
    const hasHint = this.hasHint(sql);
    const hint = this.extractHint(sql);
    const cleanSql = this.removeHints(sql);
    const sqlType = this.getSqlType(sql);
    const isValid = this.validateSql(sql);

    return {
      hasHint,
      hint,
      sqlType,
      isValid,
      cleanSql,
    };
  }

  /**
   * 创建带有指定租户的hint
   * @param tenant 租户编码
   * @returns hint字符串
   */
  static createHint(tenant: string): string {
    return HintParser.buildHint(tenant);
  }

  /**
   * 为SQL添加hint
   * @param sql 原始SQL
   * @param tenant 租户编码
   * @returns 带hint的SQL
   */
  static addHintToSql(sql: string, tenant: string): string {
    const hint = SqlRewriter.createHint(tenant);
    return `${hint} ${sql}`;
  }
}

```


> 代码路径  `src\types.ts`

```typescript
import { AST, Binary, ExpressionValue, ColumnRef, From } from 'node-sql-parser';

/**
 * 目标库配置
 */
export interface TargetDatabaseConfig {
  /** 库名前缀列表，如 ['tnt_'] */
  prefixes: string[];
  /** 完整库名列表，如 ['global_mb'] */
  fullNames: string[];
  /** 默认库名，用于处理无库名的表。**必须设置**，否则遇到无库名表时会抛出异常 */
  defaultDatabase: string;
}

/**
 * 库名改写配置
 */
export interface DatabaseRewriteConfig {
  /** 是否启用库名改写，默认为 false */
  enabled: boolean;
  /** 数据库名前缀，如 'dev_mc_' */
  dbPrefix: string;
  /** 需要改写的库名列表，如果为空则改写所有库名 */
  targetDatabases?: string[];
  /** 排除的库名列表，这些库不会被改写 */
  excludeDatabases?: string[];
  /** 是否保留原始库名作为后缀，默认为 true */
  preserveOriginalName?: boolean;
  /** 包装型语句配置 */
  wrapperStatements?: WrapperStatementConfig;
}

/**
 * SQL解析器配置
 */
export interface SqlParserConfig {
  /** 租户字段名，默认为 'tenant' */
  tenantField: string;
  /** 数据库类型，固定为 mysql */
  database: 'mysql';
  /** 解析失败时是否抛出异常，默认为 true */
  throwOnError: boolean;
  /** 目标库配置，用于指定需要添加租户条件的库 */
  targetDatabases?: TargetDatabaseConfig;
  /** 库名改写配置 */
  databaseRewrite?: DatabaseRewriteConfig;
  /** 包装型语句配置 */
  wrapperStatements?: WrapperStatementConfig;
}

/**
 * 注释信息接口
 */
export interface CommentInfo {
  /** 注释内容（包括注释符号） */
  content: string;
  /** 注释类型 */
  type: 'block' | 'line';
  /** 在原SQL中的起始位置 */
  start: number;
  /** 在原SQL中的结束位置 */
  end: number;
}

/**
 * Hint信息接口
 */
export interface HintInfo {
  /** 租户编码 */
  tenant?: string;
  /** 原始hint字符串 */
  original?: string;
}

/**
 * 库名改写结果
 */
export interface DatabaseRewriteResult {
  /** 原始库名 */
  originalName: string;
  /** 改写后的库名 */
  rewrittenName: string;
  /** 是否进行了改写 */
  modified: boolean;
}

/**
 * 数据库名改写结果
 */
export interface DatabaseRewriteOnlyResult {
  /** 改写后的SQL */
  sql: string;
  /** 是否进行了改写 */
  modified: boolean;
  /** 库名改写详情列表 */
  databaseRewrites: DatabaseRewriteResult[];
}

/**
 * SQL改写结果（租户条件添加）
 */
export interface RewriteResult {
  /** 改写后的SQL */
  sql: string;
  /** 是否进行了改写 */
  modified: boolean;
  /** 提取的hint信息 */
  hint?: HintInfo;
}

/**
 * 租户条件生成器
 */
export interface TenantCondition {
  /** 表别名或表名 */
  table?: string | null;
  /** 租户字段名 */
  field: string;
  /** 租户值 */
  value: string;
}

/**
 * AST转换上下文
 */
export interface TransformContext {
  /** 租户条件 */
  tenantCondition: TenantCondition;
  /** 当前处理的表列表 */
  currentTables: Set<string>;
  /** 当前处理的需要添加租户条件的表列表 */
  targetTables: Set<string>;
  /** CTE（WITH子句）定义的临时表名列表 */
  cteTableNames: Set<string>;
  /** 是否在子查询中 */
  inSubQuery: boolean;
  /** 目标库配置 */
  targetDatabaseConfig?: TargetDatabaseConfig;
}

/**
 * 表信息
 */
export interface TableInfo {
  /** 表名 */
  name: string;
  /** 别名 */
  alias?: string | null;
  /** 数据库名 */
  db?: string | null;
  /** 完整表名 */
  fullName: string;
}

/**
 * 扩展的AST类型，包含我们需要的额外信息
 */
export interface ExtendedAST {
  _rewritten?: boolean;
  _tenantConditionAdded?: boolean;
}

/**
 * 条件表达式构建器类型
 */
export type ConditionBuilder = (
  table: string | null,
  field: string,
  value: string,
) => Binary;

/**
 * SQL类型枚举
 */
export enum SqlType {
  SELECT = 'select',
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  REPLACE = 'replace',
  CREATE = 'create',
  ALTER = 'alter',
  DROP = 'drop',
  USE = 'use',
}

/**
 * 包装型语句配置
 */
export interface WrapperStatementConfig {
  /** 是否启用包装型语句支持，默认false */
  enabled: boolean;
  /** 支持的包装型语句类型列表 */
  supportedTypes: string[];
  /** 是否验证内层SQL的有效性，默认true */
  validateInnerSql?: boolean;
  /** 自定义包装型语句模式（高级用法） */
  customPatterns?: Array<{
    type: string;
    pattern: RegExp;
    validateInner?: (innerSql: string) => boolean;
  }>;
}

/**
 * 包装型语句信息接口
 */
export interface WrapperInfo {
  hasWrapper: boolean;
  wrapperType: string;
  prefix: string;
  innerSql: string;
  originalSql: string;
}

```


#### 代码说明

# @cs/sql-parser

一个强大的SQL解析器，用于自动为SQL语句添加租户过滤条件。通过解析SQL注释中的hint信息，自动在查询中注入租户隔离逻辑。


## 📦 安装

```bash
pnpm add @cs/sql-parser
```

## 🔧 基本用法

### 简单使用

```typescript
import SqlParserService from '@cs/sql-parser';

// 基本SELECT查询
const sql = "/*& tenant:'sxlq' */ SELECT * FROM users";
const result = SqlParserService.rewriteWithTenant(sql);
console.log(result); 
// 输出: SELECT * FROM `users` WHERE `users`.`tenant` = 'sxlq'

// INSERT语句
const insertSql = "/*& tenant:'sxlq' */ INSERT INTO users (username, email) VALUES ('john', 'john@example.com')";
const insertResult = SqlParserService.rewriteWithTenant(insertSql);
console.log(insertResult);
// 输出: INSERT INTO `users` (username, email, tenant) VALUES ('john','john@example.com','sxlq')
```

### 配置租户字段

```typescript
// 设置全局租户字段名（默认为'tenant'）
SqlParserService.setTenantField('org_id');

// 或者设置完整配置
SqlParserService.setConfig({
  tenantField: 'org_id',
  database: 'mysql',
  throwOnError: true,
  targetDatabases: {
    prefixes: ['tnt_', 'app_'],
    fullNames: ['global_mb', 'special_db']
  }
});
```

### 配置目标库（新功能）

**选择性SQL改写**：只对特定库进行租户条件注入，支持跨库联查场景

```typescript
// 设置目标库配置
SqlParserService.setTargetDatabases({
  prefixes: ['tnt_', 'app_'],  // 前缀匹配：tnt_main, tnt_order, app_data等
  fullNames: ['global_mb'],    // 全名匹配：global_mb库
  defaultDatabase: 'main'      // 默认库名（必须设置）
});

// 动态添加数据库前缀
SqlParserService.addDatabasePrefix('tenant_');

// 动态添加完整数据库名
SqlParserService.addDatabaseName('special_database');

// 设置默认库名（用于处理无库名的表）
SqlParserService.setDefaultDatabase('tnt_main');
```

### 📋 **默认库处理机制（重要）**

当SQL中的表没有指定库名时（如 `SELECT * FROM users`），系统会使用配置的`defaultDatabase`来判断是否需要添加租户条件：

```typescript
// 示例：设置默认库为目标库
SqlParserService.setDefaultDatabase('tnt_main');

// 无库名表将被当作 tnt_main.users 处理
"SELECT * FROM users" 
// → 添加租户条件（因为tnt_main匹配前缀tnt_）

// 示例：设置默认库为非目标库  
SqlParserService.setDefaultDatabase('public');

// 无库名表将被当作 public.users 处理
"SELECT * FROM users"
// → 不添加租户条件（因为public不匹配任何规则）
```

**⚠️ 重要提醒**：
- `defaultDatabase` 是**必须配置**的，如果遇到无库名表时没有配置默认库，系统会抛出异常
- 默认库应该设置为你的数据库连接实际使用的默认库名
- 这样可以准确模拟数据库连接的真实行为

## 🎯 支持的SQL类型

### SELECT查询

```sql
-- 基本查询
/*& tenant:'sxlq' */ SELECT * FROM users
-- → SELECT * FROM `users` WHERE `users`.`tenant` = 'sxlq'

-- JOIN查询
/*& tenant:'sxlq' */ SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id
-- → SELECT `u`.`name`, `o`.`amount` FROM `users` AS `u` INNER JOIN `orders` AS `o` ON `u`.`id` = `o`.`user_id` WHERE `u`.`tenant` = 'sxlq' AND `o`.`tenant` = 'sxlq'

-- 跨库联查（选择性改写）
/*& tenant:'sxlq' */ SELECT u.name, p.title FROM tnt_main.users u JOIN public.posts p ON u.id = p.user_id
-- → SELECT `u`.`name`, `p`.`title` FROM `tnt_main`.`users` AS `u` INNER JOIN `public`.`posts` AS `p` ON `u`.`id` = `p`.`user_id` WHERE `u`.`tenant` = 'sxlq'
-- 注意：只有tnt_main.users添加了租户条件，public.posts没有
```

### INSERT语句

```sql
-- VALUES格式（目标库）
/*& tenant:'sxlq' */ INSERT INTO tnt_main.users (name, email) VALUES ('John', 'john@example.com')
-- → INSERT INTO `tnt_main`.`users` (name, email, tenant) VALUES ('John','john@example.com','sxlq')

-- VALUES格式（非目标库，不添加租户字段）
/*& tenant:'sxlq' */ INSERT INTO public.logs (message) VALUES ('日志信息')
-- → INSERT INTO `public`.`logs` (message) VALUES ('日志信息')

-- INSERT...SELECT格式（选择性改写）
/*& tenant:'sxlq' */ INSERT INTO tnt_order.orders (user_id, product) SELECT u.id, 'iPhone' FROM tnt_main.users u WHERE u.active = 1
-- → INSERT INTO `tnt_order`.`orders` (user_id, product, tenant) SELECT `u`.`id`, 'iPhone' FROM `tnt_main`.`users` AS `u` WHERE `u`.`active` = 1 AND `u`.`tenant` = 'sxlq'
```

### UPDATE和DELETE语句

```sql
-- UPDATE（目标库）
/*& tenant:'sxlq' */ UPDATE global_mb.products SET price = 100 WHERE id = 1
-- → UPDATE `global_mb`.`products` SET `price` = 100 WHERE `id` = 1 AND `products`.`tenant` = 'sxlq'

-- UPDATE（非目标库，不添加租户条件）
/*& tenant:'sxlq' */ UPDATE system.configs SET value = 'new_value' WHERE key = 'setting'
-- → UPDATE `system`.`configs` SET `value` = 'new_value' WHERE `key` = 'setting'

-- DELETE（目标库）
/*& tenant:'sxlq' */ DELETE FROM tnt_temp.old_records WHERE created_at < '2023-01-01'
-- → DELETE FROM `tnt_temp`.`old_records` WHERE `created_at` < '2023-01-01' AND `old_records`.`tenant` = 'sxlq'
```

## 📋 API参考

### SqlParserService

```typescript
// 核心方法
static rewriteWithTenant(sql: string): string
static rewriteWithDetails(sql: string): RewriteResult
static batchRewrite(sqlList: string[]): string[]

// 配置管理
static setTenantField(fieldName: string): void
static setConfig(config: Partial<SqlParserConfig>): void
static setTargetDatabases(targetDatabases: TargetDatabaseConfig): void
static addDatabasePrefix(prefix: string): void
static addDatabaseName(dbName: string): void
static setDefaultDatabase(defaultDatabase: string): void

// 实用方法
static extractHint(sql: string): HintInfo
static hasHint(sql: string): boolean
static removeHints(sql: string): string
static validateSql(sql: string): boolean
```

## 🧪 测试验证

本库已通过大量测试用例验证，包括：

✅ 基本SQL操作（SELECT、INSERT、UPDATE、DELETE）  
✅ 复杂JOIN查询（多表、自连接）  
✅ 子查询（WHERE、FROM、SELECT中的子查询）  
✅ WITH子句（CTE，包括递归CTE）  
✅ 窗口函数  
✅ UNION/UNION ALL操作  
✅ EXISTS和NOT EXISTS子查询  
✅ INSERT...SELECT复杂场景  

```bash
# 运行综合测试套件（推荐）
node -r ts-node/register src/comprehensive-test.ts

# 或者运行跨库联查专项测试
node -r ts-node/register src/cross-database-test.ts
```


