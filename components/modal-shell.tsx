"use client";

import { X } from "lucide-react";
import { useId, useRef } from "react";
import type { ReactNode } from "react";

/**
 * 应用级 dialog 骨架：触发按钮 + modal-layout/modal-header + backdrop 点击关闭 + aria-labelledby。
 * 文案由调用方传成品字符串（组件不引入 Locale）；children 以 render-prop 形态获得 close。
 * 类名结构（modal/modal-layout/modal-header/icon-button）逐字保留，e2e 与 CSS 依赖。
 */
export function ModalShell({ triggerLabel, triggerClassName, title, subtitle, closeLabel, children }: { triggerLabel: string; triggerClassName: "primary-button" | "secondary-button"; title: string; subtitle: string; closeLabel: string; children: (api: { close: () => void }) => ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const close = () => dialog.current?.close();
  return <>
    <button className={triggerClassName} onClick={() => dialog.current?.showModal()}>{triggerLabel}</button>
    <dialog ref={dialog} className="modal" aria-labelledby={titleId} onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="modal-layout">
        <header className="modal-header"><div><h2 id={titleId}>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={close} aria-label={closeLabel} title={closeLabel}><X size={18} /></button></header>
        {children({ close })}
      </div>
    </dialog>
  </>;
}
