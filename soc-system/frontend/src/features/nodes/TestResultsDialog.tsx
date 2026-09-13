import { useI18n } from '../../i18n/i18n-context';
import { TestConnectionResult } from './nodes-api';

interface Props {
  result: TestConnectionResult;
  onClose: () => void;
}

export function TestResultsDialog({ result, onClose }: Props) {
  const { t } = useI18n();

  return (
    <div className="soc-modal-backdrop" role="dialog" aria-modal="true">
      <div className="soc-modal">
        <h2 className="soc-title">{t.nodes.testResultsTitle}</h2>
        <div>
          Overall: <strong>{result.overallStatus}</strong>
          {result.latencyMs !== null && <> — {result.latencyMs}ms</>}
        </div>
        <div className="soc-steps-list">
          {result.steps.map((step) => (
            <div className="soc-step-row" key={step.step}>
              <span className={`soc-step-status soc-step-${step.status}`}>{step.status}</span>
              <span>
                {step.step}. {step.name} — {step.detail}
              </span>
            </div>
          ))}
        </div>
        <button className="soc-button" style={{ marginTop: 16 }} onClick={onClose}>
          {t.nodes.close}
        </button>
      </div>
    </div>
  );
}
