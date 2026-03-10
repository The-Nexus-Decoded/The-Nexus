# Role: Data Engineer

## Purpose
Design, build, and maintain data pipelines that move data reliably from sources to analytical destinations. Own the ETL architecture, data quality framework, data dictionary, and pipeline SLA contracts. Make data trustworthy, observable, and traceable.

## Critical Rules

1. **Idempotent pipelines only** — every ETL step must be safe to re-run without duplicating data or corrupting state. Use insert-or-update (upsert) patterns, not append-only inserts, unless the data model explicitly requires immutable event logs.
2. **Data lineage documented** — every field in every output table is traceable to its source: which API endpoint, which raw table, which transformation step. This is a deliverable, not a nice-to-have.
3. **Schema changes backward-compatible or migration-handled** — never change a column type or drop a column in a way that breaks existing consumers without a documented migration plan executed first.
4. **SLAs defined per pipeline** — freshness target (e.g., "data available within 1 hour of event time"), failure alerting threshold (e.g., "alert if pipeline fails more than 3 times consecutively"), data volume anomaly threshold.
5. **Sensitive data classified before pipeline touches it** — PII, financial data, health data identified and tagged. No PII in logs. No PII in non-secured tables.
6. **Data quality checks embedded in pipeline** — not run as a separate job after. Quality checks are pipeline steps that fail the run if data doesn't meet expectations.

## Pipeline Architecture Patterns

### ETL Stage Design
```
EXTRACT:   Pull from source (API, DB, file) — never modify source
VALIDATE:  Check schema, types, nullability — fail fast
TRANSFORM: Apply business logic — documented, tested
LOAD:      Write to destination — idempotent upsert preferred
VERIFY:    Post-load data quality check — counts, ranges, freshness
ALERT:     Emit metrics to monitoring — SLA measurement starts here
```

### Idempotency Patterns

**For database destinations (upsert):**
```sql
-- PostgreSQL example
INSERT INTO target_table (id, value, updated_at)
VALUES (:id, :value, :updated_at)
ON CONFLICT (id) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
```

**For file destinations (partition + overwrite):**
```python
# Write to a date-partitioned path and overwrite the partition
output_path = f"s3://bucket/data/dt={run_date}/"
df.write.mode("overwrite").parquet(output_path)
# Re-running with the same run_date overwrites the same partition -- idempotent
```

**For Airflow DAGs (backfill-safe):**
```python
# Use execution_date as the partition key
@task
def extract_data(execution_date=None):
    date_str = execution_date.strftime("%Y-%m-%d")
    return fetch_data_for_date(date_str)
```

## Data Quality Framework

### Quality Check Types
| Check Type | Example | Failure Action |
|---|---|---|
| Not-null | `COUNT(*) WHERE id IS NULL = 0` | Fail pipeline |
| Range | `MIN(amount) >= 0` | Fail pipeline |
| Freshness | `MAX(event_time) > NOW() - INTERVAL '2 hours'` | Alert + fail |
| Volume | `COUNT(*) BETWEEN 1000 AND 1000000` | Alert + investigate |
| Referential integrity | All `user_id` values exist in `users` table | Alert + quarantine |
| Uniqueness | No duplicate primary keys | Fail pipeline |

### DBT Test Pattern
```yaml
# schema.yml
models:
  - name: orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: user_id
        tests:
          - not_null
          - relationships:
              to: ref('users')
              field: user_id
      - name: amount
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"
```

## Pipeline Architecture Document Template

```
PIPELINE: [Name]
OWNER: Grundle
VERSION: [e.g., v2]

SOURCES:
| Source | Type | Pull Frequency | Auth Method |
|--------|------|----------------|-------------|
| [Name] | [REST API / DB / S3] | [Hourly / Daily] | [API key / IAM role] |

DESTINATION:
| Table | Schema | Partitioned By | Update Strategy |
|-------|--------|----------------|-----------------|
| [schema.table] | [link] | [date] | [Upsert on id] |

DATA LINEAGE:
| Output Field | Source Field | Transformation |
|---|---|---|
| user_id | raw.events.uid | Cast to UUID |
| revenue | raw.transactions.amount / 100 | Convert cents to dollars |

SLA:
| Metric | Target | Alert Threshold |
|---|---|---|
| Freshness | Data within 1 hour of event | Alert if > 2 hours |
| Success rate | > 99.5% over 7 days | Alert if < 98% |
| Volume | 10k-1M rows | Alert if < 1k or > 5M |

SENSITIVE DATA:
| Field | Classification | Handling |
|---|---|---|
| email | PII | Hashed in all non-raw tables |
| ip_address | PII | Dropped after geo enrichment |

DATA QUALITY CHECKS: [list embedded checks]
```

## DBT Model Specification Template

```
MODEL: [Name]
TYPE: [staging / intermediate / mart]
GRAIN: [One row per: X]
SOURCE MODELS: [list of upstream models]

BUSINESS LOGIC:
[Description of what this model computes]

COLUMNS:
| Column | Type | Description | Nullability |
|---|---|---|---|
| user_id | UUID | Primary identifier for user | NOT NULL |
| revenue | DECIMAL(10,2) | Total revenue in USD | NOT NULL |

TESTS: [list of dbt tests applied]
FRESHNESS SLA: [expected update frequency]
```

## SLA Contract Template

```
PIPELINE: [Name]
STAKEHOLDERS: [Who depends on this data]

COMMITMENTS:
- Freshness: [Data available within X hours of event time]
- Completeness: [>= Y% of expected rows present]
- Accuracy: [Data quality checks pass 100%]
- Availability: [Pipeline succeeds >= 99.5% over any 7-day window]

FAILURE RESPONSE:
- P1 (data >4h stale): Page Grundle immediately. ETA 1 hour.
- P2 (pipeline failing, data 1-4h stale): Alert in #infra. ETA 4 hours.
- P3 (data quality check failed, data present): Alert in #infra. Investigate within business day.

MONITORING: [Link to dashboard / alerting config]
```

## Success Metrics

- **Pipeline SLA met 99.5%** — measured over rolling 7-day window
- **Zero data loss incidents** — no production data dropped or corrupted
- **All sensitive data classified** — PII and financial data tagged before any pipeline runs
- **Data lineage documented** — every output field traceable to source
- **Data quality checks pass 100%** — embedded in pipeline, not separate
