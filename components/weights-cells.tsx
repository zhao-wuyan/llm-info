import { ExternalLink, Heart, Lock, ShieldCheck, ShieldQuestion } from "lucide-react";
import { compactNumber } from "@/lib/format";
import { msg, type Locale } from "@/lib/i18n";
import type { WeightsEvidence } from "@/lib/types";

const missing = <span className="missing">-</span>;

/** 开源权重列：有 Hugging Face 证据时直接给出仓库链接，否则回落到上游 openWeights 标记。 */
export function OpenWeightsCell({ weights, openWeights, locale }: { weights?: WeightsEvidence; openWeights?: boolean; locale: Locale }) {
  if (weights) {
    return (
      <span className="weights-cell">
        <a className="source-link" href={weights.repoUrl} target="_blank" rel="noreferrer" title={weights.repoId}>
          <span className="weights-repo">{weights.repoId}</span>
          <ExternalLink aria-hidden size={12} />
        </a>
        {weights.gated && <span className="tag warning" title={msg(locale, "gatedRepo")}><Lock aria-hidden size={11} />{msg(locale, "gatedRepo")}</span>}
      </span>
    );
  }
  return openWeights ? <span className="tag success">{msg(locale, "openWeights")}</span> : missing;
}

/** 许可证列：SPDX 命中显示为可信标签，自定义模型协议显示为提示标签。 */
export function LicenseCell({ weights, locale }: { weights?: WeightsEvidence; locale: Locale }) {
  if (!weights?.license) return missing;
  const spdx = weights.licenseType === "spdx";
  const title = `${spdx ? msg(locale, "spdxLicense") : msg(locale, "customLicense")}: ${weights.licenseName ?? weights.license}`;
  const className = `tag ${spdx ? "success" : "warning"}`;
  const content = (
    <>
      {spdx ? <ShieldCheck aria-hidden size={12} /> : <ShieldQuestion aria-hidden size={12} />}
      {weights.license}
    </>
  );
  return weights.licenseUrl
    ? <a className={className} href={weights.licenseUrl} target="_blank" rel="noreferrer" title={title}>{content}</a>
    : <span className={className} title={title}>{content}</span>;
}

export function DownloadsCell({ weights }: { weights?: WeightsEvidence }) {
  return weights?.downloads == null ? missing : <span className="mono" title={`${weights.downloads}`}>{compactNumber(weights.downloads)}</span>;
}

export function LikesCell({ weights }: { weights?: WeightsEvidence }) {
  if (weights?.likes == null) return missing;
  return <span className="mono likes-cell" title={`${weights.likes}`}><Heart aria-hidden size={11} />{compactNumber(weights.likes)}</span>;
}

export function ParametersCell({ weights }: { weights?: WeightsEvidence }) {
  if (weights?.parameters == null) return missing;
  return <span className="mono" title={`${weights.parameters}`}>{compactNumber(weights.parameters)}</span>;
}
