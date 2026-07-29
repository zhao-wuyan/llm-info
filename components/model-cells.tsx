import { compactNumber, formatReleaseDate } from "@/lib/format";
import { abilityMsg, msg, type Locale } from "@/lib/i18n";
import type { ColumnDef } from "@/lib/model-columns";
import { formatParameters, indexFor, licenseTone } from "@/lib/model-index";
import type { CanonicalModel, Currency } from "@/lib/types";
import { PriceValue } from "@/components/ui";

const priceRates: Record<string, string> = {
  input: "textInput",
  output: "textOutput",
  cacheRead: "textInput_cacheRead",
  cacheWrite: "textInput_cacheWrite",
};

const missing = <span className="missing">-</span>;

/** Render one registry column for one canonical model. */
export function ModelCell({ column, model, locale, currency }: { column: ColumnDef; model: CanonicalModel; locale: Locale; currency: Currency }) {
  const record = indexFor(model.canonicalId);
  const facts = record.openWeights;

  if (column.boardId) {
    const score = record.boards[column.boardId];
    if (!score || score.score == null) return <td className="mono board-cell">{missing}</td>;
    return (
      <td className="mono board-cell" title={`${score.sourceModel}${score.match === "loose" ? ` · ${msg(locale, "looseMatch")}` : ""}`}>
        <strong>{formatScore(score.score)}</strong>
        {score.rank != null && <small>#{score.rank}</small>}
      </td>
    );
  }

  if (priceRates[column.id]) {
    return <td><PriceValue price={model.displayPrices[currency]} rate={priceRates[column.id]} currency={currency} locale={locale} /></td>;
  }

  switch (column.id) {
    case "released":
      return <td className="mono release-date-cell">{formatReleaseDate(model.releasedAt)}</td>;
    case "context":
      return <td className="mono">{compactNumber(model.contextWindow)}</td>;
    case "maxOutput":
      return <td className="mono">{compactNumber(model.maxOutput)}</td>;
    case "providers":
      return <td className="mono">{model.providerCount}</td>;
    case "weights":
      return <td>{facts || model.openWeights
        ? <span className="tag success" title={facts?.repoId}>{msg(locale, "openWeightsLabel")}{facts?.gated ? ` · ${msg(locale, "gated")}` : ""}</span>
        : <span className="tag">{msg(locale, "closedWeights")}</span>}</td>;
    case "license":
      return <td>{facts?.license
        ? <a className={`tag license-${licenseTone(facts.license)}`} href={facts.licenseUrl ?? `https://huggingface.co/${facts.repoId}`} target="_blank" rel="noreferrer">{facts.license}</a>
        : missing}</td>;
    case "parameters":
      return <td className="mono">{facts?.parameters ? formatParameters(facts.parameters) : missing}</td>;
    case "downloads":
      return <td className="mono">{facts?.popularity.downloads30d != null ? compactNumber(facts.popularity.downloads30d) : missing}</td>;
    case "likes":
      return <td className="mono">{facts?.popularity.likes != null ? compactNumber(facts.popularity.likes) : missing}</td>;
    case "ability":
      return <td><div className="tag-list">{Object.entries(model.abilities).filter(([, value]) => value).slice(0, 3).map(([key]) => <span className="tag" key={key}>{abilityMsg(locale, key)}</span>)}</div></td>;
    default:
      return <td>{missing}</td>;
  }
}

export function formatScore(score: number) {
  if (Number.isInteger(score)) return score >= 100_000 ? compactNumber(score) : String(score);
  return score.toFixed(1);
}
