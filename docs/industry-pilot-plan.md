# Industry pilot plan

Last reviewed: 2026-09-04

## Decision

Expand only after the existing lead set is migrated and re-audited. The first new-data pilot is capped at 10 qualified businesses per API run and prioritizes HVAC, plumbers, med spas, and lawyers. Electricians, general contractors, and accountants follow after the first four categories meet the data-quality gate. No outreach is part of this pilot.

The profiles live in `packages/lead-engine/src/config.ts`. They are hypotheses for calibration, not permanent market truths. Google says local results depend mainly on relevance, distance, and prominence, so the pilot retains territory coverage and uses rating/review count as operating-signal proxies rather than treating reviews as a complete quality measure.

## Evidence used

- Google lists plumbing/contracting, lawyers/accounting, and dentists among Local Services Ads examples, supporting the premise that these categories have measurable local-intent acquisition value: <https://business.google.com/us/ad-solutions/local-service-ads/>
- Google's Business Profile guidance identifies relevance, distance, and prominence as the main local-result factors: <https://support.google.com/business/answer/7091>
- LocaliQ's 2026 search benchmark reports comparatively high CPCs for attorneys ($9.87), home improvement ($8.33), and dentists ($8.00), which supports giving revenue/acquisition potential meaningful but non-dominant weight: <https://localiq.com/blog/search-advertising-benchmarks/>
- American Med Spa Association reports an industry above $17B and growing by more than $1B annually. This supports a high revenue-potential hypothesis, while medical/compliance variance requires manual review: <https://www.americanmedspa.org/med-spa-statistics/>
- Census County Business Patterns provides establishment and payroll counts by geography and industry; use it in the next calibration cycle to compare provider sample coverage with the local business population: <https://www.census.gov/programs-surveys/cbp.html>

## Calibration profiles

| Category | Priority | Min rating | Min reviews | NYC + NJ minimum | BQ / DW / RP | RP | Why this first hypothesis |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HVAC | 1 | 4.3 | 30 | 12 + 12 | 40 / 35 / 25 | 100 | Urgent and high-ticket work; conversion path matters |
| Plumber | 1 | 4.3 | 35 | 12 + 12 | 42 / 35 / 23 | Strong local intent and repeat/referral value |
| Med spa | 1 | 4.4 | 40 | 12 + 12 | 35 / 35 / 30 | Repeat treatments and strong visual/booking dependence; manual compliance review required |
| Law firm | 1 | 4.3 | 20 | 16 + 16 | 38 / 32 / 30 | High acquisition cost/value, but practice-area heterogeneity needs a larger sample |
| Electrician | 2 | 4.3 | 25 | 12 + 12 | 43 / 35 / 22 | Local urgency and trust signals; somewhat lower modeled ticket than HVAC |
| General contractor | 2 | 4.3 | 20 | 16 + 16 | 45 / 30 / 25 | High project value, but broad category and long sales cycle need more manual labels |
| Accountant | 2 | 4.3 | 15 | 12 + 12 | 45 / 30 / 25 | Recurring client value, lower public-review frequency, and seasonal demand |

`BQ` is Business Quality, `DW` is Digital Weakness, and `RP` is Revenue Potential. Every weight set sums to 100%. Email availability remains only a 3-point routing bonus and never establishes business quality.

## Small-batch sequence

1. Apply the quality migration and re-audit all 17 existing businesses. Gate: 100% have `lead_quality_status=verified`; every displayed email has an official source URL; browser and fetch classifications agree or the record is `unknown`.
2. Pilot A: run one 10-business batch per priority-1 category in one NYC and one NJ territory. Stop at 80 total newly audited leads maximum.
3. Manually label false website failures, false emails, franchise/duplicate records, and whether the opportunity is commercially plausible. Gate: at least 95% website-status agreement, 100% email precision, no unresolved duplicate, and at least 30% plausible opportunities in each category.
4. Complete each category's NYC/NJ calibration minimum only if its first batch passes. Do not interpret 24–32 observations as a market-size estimate; it is a parser/ranking calibration sample.
5. Pilot B adds electricians, contractors, and accountants with the same 10-business run cap. Re-rank category priority using verified opportunity rate, manual audit minutes per lead, and expected gross profit—not lead count.

## Stop conditions

- More than one false email in a batch: stop that category and repair/re-audit before expansion.
- Website false-unreachable rate above 5%: stop automated qualification and investigate transport/anti-bot patterns.
- Duplicate rate above 10% after `place_id` deduplication: inspect multi-location/franchise identity before more scans.
- Fewer than 3 commercially plausible opportunities in the first 10 qualified leads: do not expand that category without changing the hypothesis.
- Any provider rate-limit, terms, credential, or cost uncertainty: stop the run; never bypass the provider.
