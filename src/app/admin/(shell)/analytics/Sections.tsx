import Link from "next/link";

import { BarChart } from "@/components/admin/charts/BarChart";
import { Donut } from "@/components/admin/charts/Donut";
import { LineChart } from "@/components/admin/charts/LineChart";
import {
  categories as readCategories,
  duration as readDuration,
  paths as readPaths,
  sales as readSales,
  sizes as readSizes,
} from "@/lib/analytics/insights";
import { nextSteps } from "@/lib/analytics/nextSteps";
import {
  campaigns,
  colourwayConversion,
  funnel,
  topProducts,
  traffic,
} from "@/lib/analytics/reports";
import { formatNaira } from "@/lib/money";

import m from "@/components/admin/motion.module.css";
import s from "./analytics.module.css";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const naira = (kobo: number) => formatNaira(kobo);
const short = (day: string) => day.slice(8);

function clock(seconds: number) {
  if (seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

/* ---------------- headline ---------------- */

export async function Headline() {
  const [steps, days, when] = await Promise.all([funnel(30), readSales(30), readDuration(30)]);
  const sessions = days.reduce((total, day) => total + day.sessions, 0);

  const tiles = [
    { label: "Revenue", value: naira(steps.revenueKobo), note: `${steps.ordersPaid} orders` },
    {
      label: "Conversion",
      value: sessions > 0 ? percent(steps.ordersPaid / sessions) : "—",
      note: `${sessions} sessions`,
    },
    {
      label: "Basket",
      value: steps.ordersPaid > 0 ? naira(Math.round(steps.revenueKobo / steps.ordersPaid)) : "—",
      note: "average order",
    },
    {
      label: "Time on site",
      value: clock(when.medianSeconds),
      note: `median · ${when.pagesPerSession.toFixed(1)} pages`,
    },
  ];

  return (
    <ul className={s.tiles}>
      {tiles.map((tile, index) => (
        <li
          key={tile.label}
          className={`${s.tile} ${m.rise}`}
          style={{ "--i": index } as React.CSSProperties}
        >
          <span className={s.tileLabel}>{tile.label}</span>
          <span className={s.tileValue}>{tile.value}</span>
          <span className={s.tileNote}>{tile.note}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- what to do ---------------- */

export async function NextSteps() {
  const [steps, products, cats, top, when, days] = await Promise.all([
    funnel(30),
    topProducts(30),
    readCategories(30),
    readPaths(30),
    readDuration(30),
    readSales(30),
  ]);

  const sessions = days.reduce((total, day) => total + day.sessions, 0);
  const advice = nextSteps({
    funnel: steps,
    products,
    categories: cats,
    paths: top,
    duration: when,
    sales: days,
    sessions,
  });

  return (
    <section className={`${s.card} ${m.rise}`} aria-labelledby="todo">
      <h2 id="todo" className={s.cardTitle}>
        What to do next
      </h2>
      <ol className={s.steps}>
        {advice.map((step, index) => (
          <li
            key={step.title}
            className={`${s.step} ${m.rise}`}
            data-tone={step.tone}
            style={{ "--i": index + 1 } as React.CSSProperties}
          >
            <span className={s.stepTone}>
              {step.tone === "act" ? "Do this" : step.tone === "watch" ? "Watch" : "Working"}
            </span>
            <h3 className={s.stepTitle}>{step.title}</h3>
            <p className={s.stepWhy}>{step.why}</p>
            <p className={s.stepTodo}>{step.todo}</p>
            {step.href && (
              <Link href={step.href} className={s.stepLink}>
                Take me there
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------- sales over time ---------------- */

export async function SalesOverTime() {
  const days = await readSales(30);

  return (
    <section className={`${s.card} ${m.rise}`} aria-labelledby="sales">
      <div className={s.cardHead}>
        <h2 id="sales" className={s.cardTitle}>
          Sales over time
        </h2>
        <span className={s.cardNote}>30 days</span>
      </div>

      <LineChart
        series={[
          { label: "Revenue", points: days.map((day) => day.revenueKobo), format: naira },
          { label: "Sessions", points: days.map((day) => day.sessions), format: String },
        ]}
        labels={days.map((day) => short(day.day))}
        height={200}
      />
    </section>
  );
}

/* ---------------- funnel ---------------- */

export async function Funnel() {
  const steps = await funnel(30);

  const stages = [
    { label: "Product views", value: steps.productViews, of: steps.productViews },
    { label: "Added to bag", value: steps.addsToBag, of: steps.productViews },
    { label: "Bag viewed", value: steps.bagViews, of: steps.addsToBag },
    { label: "Checkout started", value: steps.checkoutsStarted, of: steps.bagViews },
    { label: "Paid", value: steps.ordersPaid, of: steps.checkoutsStarted },
  ];

  const worst = stages
    .slice(1)
    .filter((stage) => stage.of > 0)
    .sort((a, b) => a.value / a.of - b.value / b.of)[0];

  return (
    <section className={`${s.card} ${m.rise}`} aria-labelledby="funnel">
      <h2 id="funnel" className={s.cardTitle}>
        Funnel
      </h2>

      <ol className={s.funnel}>
        {stages.map((stage, index) => (
          <li
            key={stage.label}
            className={s.stage}
            data-leak={stage === worst || undefined}
            style={{ "--i": index } as React.CSSProperties}
          >
            <span className={s.stageLabel}>{stage.label}</span>
            <span className={s.stageBarWrap}>
              <span
                className={s.stageBar}
                style={
                  {
                    "--to": `${stages[0].value > 0 ? Math.max(1, (stage.value / stages[0].value) * 100) : 0}%`,
                  } as React.CSSProperties
                }
              />
            </span>
            <span className={s.stageValue}>{stage.value.toLocaleString("en-NG")}</span>
            <span className={s.stageRate}>
              {index === 0 ? "—" : stage.of > 0 ? percent(stage.value / stage.of) : "—"}
            </span>
          </li>
        ))}
      </ol>

      <p className={s.footnote}>
        Each rate is against the step above it, which is where a funnel actually leaks.
        {worst && worst.of > 0 && (
          <>
            {" "}
            The widest gap is <strong>{worst.label.toLowerCase()}</strong>.
          </>
        )}
      </p>
    </section>
  );
}

/* ---------------- what sells ---------------- */

export async function WhatSells() {
  const [products, cats, colours, picked] = await Promise.all([
    topProducts(30),
    readCategories(30),
    colourwayConversion(30),
    readSizes(30),
  ]);

  return (
    <div className={s.grid}>
      <section className={`${s.card} ${m.rise}`} aria-labelledby="pieces">
        <h2 id="pieces" className={s.cardTitle}>
          Most viewed pieces
        </h2>
        {products.length === 0 ? (
          <p className={s.quiet}>Nothing viewed yet.</p>
        ) : (
          <BarChart
            bars={products.slice(0, 8).map((product) => ({
              label: product.productName,
              value: product.views,
              note: `${product.addsToBag} to bag · ${percent(product.addToBagRate)}`,
            }))}
          />
        )}
      </section>

      <section className={`${s.card} ${m.rise}`} aria-labelledby="cats">
        <h2 id="cats" className={s.cardTitle}>
          By category
        </h2>
        {cats.length === 0 ? (
          <p className={s.quiet}>Nothing viewed yet.</p>
        ) : (
          <Donut
            slices={cats.map((row) => ({ label: row.category, value: row.views }))}
            total={String(cats.reduce((all, row) => all + row.views, 0))}
            totalLabel="views"
          />
        )}
      </section>

      <section className={`${s.card} ${m.rise}`} aria-labelledby="colours">
        <h2 id="colours" className={s.cardTitle}>
          Colourways
        </h2>
        {colours.length === 0 ? (
          <p className={s.quiet}>Nothing added to a bag yet.</p>
        ) : (
          <BarChart
            bars={colours.slice(0, 8).map((row) => ({
              label: row.colourway,
              value: row.addsToBag,
              note: row.productName,
            }))}
          />
        )}
        <p className={s.footnote}>
          Counted by adds to bag: a product view does not carry a colour until someone picks one.
        </p>
      </section>

      <section className={`${s.card} ${m.rise}`} aria-labelledby="sizes">
        <h2 id="sizes" className={s.cardTitle}>
          Sizes picked
        </h2>
        {picked.length === 0 ? (
          <p className={s.quiet}>No sizes chosen yet.</p>
        ) : (
          <Donut
            slices={picked.map((row) => ({ label: row.size, value: row.picked }))}
            total={String(picked.reduce((all, row) => all + row.picked, 0))}
            totalLabel="picked"
          />
        )}
        <p className={s.footnote}>What to cut more of, and what to stop cutting.</p>
      </section>
    </div>
  );
}

/* ---------------- where they go ---------------- */

export async function WhereTheyGo() {
  const [top, when, sources, days] = await Promise.all([
    readPaths(30),
    readDuration(30),
    campaigns(30),
    traffic(30),
  ]);

  const busiest = Math.max(1, ...days.map((day) => day.views));

  return (
    <div className={s.grid}>
      <section className={`${s.card} ${m.rise}`} aria-labelledby="pages">
        <h2 id="pages" className={s.cardTitle}>
          Most visited pages
        </h2>
        {top.length === 0 ? (
          <p className={s.quiet}>No page views yet.</p>
        ) : (
          <BarChart
            bars={top.map((row) => ({
              label: row.path,
              value: row.views,
              note: `${row.sessions} ${row.sessions === 1 ? "session" : "sessions"}`,
            }))}
          />
        )}
      </section>

      <section className={`${s.card} ${m.rise}`} aria-labelledby="stay">
        <h2 id="stay" className={s.cardTitle}>
          How long they stay
        </h2>
        <dl className={s.stats}>
          <div className={s.stat}>
            <dt>Median visit</dt>
            <dd>{clock(when.medianSeconds)}</dd>
          </div>
          <div className={s.stat}>
            <dt>Longest tenth</dt>
            <dd>{clock(when.p90Seconds)}</dd>
          </div>
          <div className={s.stat}>
            <dt>One-page visits</dt>
            <dd>{percent(when.bounceRate)}</dd>
          </div>
          <div className={s.stat}>
            <dt>Pages per visit</dt>
            <dd>{when.pagesPerSession.toFixed(1)}</dd>
          </div>
          <div className={s.stat}>
            <dt>Busiest day</dt>
            <dd>{busiest} views</dd>
          </div>
        </dl>
        <p className={s.footnote}>
          {/* Nobody sends an event on the way out, so the last page of a visit is not
              counted. A single-page visit measures zero and is reported as a bounce
              rather than folded into the median, where it would drag it down. */}
          Measured from first to last event, so a one-page visit reads as zero and is counted as a
          bounce instead.
        </p>
      </section>

      <section className={`${s.card} ${m.rise}`} aria-labelledby="where">
        <h2 id="where" className={s.cardTitle}>
          Where they came from
        </h2>
        {sources.length === 0 ? (
          <p className={s.quiet}>
            No tagged traffic yet. Add <code className={s.code}>?utm_source=instagram</code> to a
            link and it appears here, with how many of those visits bought.
          </p>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Campaign</th>
                <th scope="col">Sessions</th>
                <th scope="col">Bought</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((row) => (
                <tr key={`${row.source}-${row.campaign}`}>
                  <td>{row.source}</td>
                  <td>{row.campaign ?? "—"}</td>
                  <td className={s.num}>{row.sessions}</td>
                  <td className={s.num}>{row.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
