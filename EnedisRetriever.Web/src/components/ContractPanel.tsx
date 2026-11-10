import { useEffect, useRef } from 'react';

import {
  SUBSCRIBED_POWERS_KVA,
  ttcRates,
  type ElectricityContract,
  type TariffOption
} from '../types/electricityContract';
import { CloseIcon } from './Icons';
import NumberField from './NumberField';
import OffPeakEditor from './OffPeakEditor';

type Props = {
  open: boolean;
  onClose: () => void;
  contract: ElectricityContract;
  onChange: (contract: ElectricityContract) => void;
  onReset: () => void;
};

const OPTION_LABEL: Record<TariffOption, string> = {
  base: 'Base',
  hphc: 'Heures creuses'
};

/** "≈ 0,1741 € TTC" under an HT field, so the entered value can be checked at a glance. */
function ttcHint(value: number, unit: string, digits = 4): string {
  return `soit ${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: digits })} ${unit} TTC`;
}

function TariffFields({
  option,
  contract,
  onChange
}: {
  option: TariffOption;
  contract: ElectricityContract;
  onChange: (contract: ElectricityContract) => void;
}) {
  const rates = ttcRates(contract, option);

  const subscription = (
    <NumberField
      label="Abonnement HT"
      unit="€/mois"
      value={contract[option].monthlySubscriptionHt}
      hint={ttcHint(rates.monthlySubscription, "€/mois", 2)}
      onChange={(monthlySubscriptionHt) =>
        onChange({ ...contract, [option]: { ...contract[option], monthlySubscriptionHt } })
      }
    />
  );

  if (option === "base") {
    return (
      <div className="field-grid">
        <NumberField
          label="kWh HT"
          unit="€/kWh"
          value={contract.base.pricePerKwhHt}
          hint={ttcHint(rates.peak, "€")}
          onChange={(pricePerKwhHt) =>
            onChange({ ...contract, base: { ...contract.base, pricePerKwhHt } })
          }
        />
        {subscription}
      </div>
    );
  }

  return (
    <div className="field-grid">
      <NumberField
        label="kWh heures pleines HT"
        unit="€/kWh"
        value={contract.hphc.peakPricePerKwhHt}
        hint={ttcHint(rates.peak, "€")}
        onChange={(peakPricePerKwhHt) =>
          onChange({ ...contract, hphc: { ...contract.hphc, peakPricePerKwhHt } })
        }
      />
      <NumberField
        label="kWh heures creuses HT"
        unit="€/kWh"
        value={contract.hphc.offPeakPricePerKwhHt}
        hint={ttcHint(rates.offPeak, "€")}
        onChange={(offPeakPricePerKwhHt) =>
          onChange({ ...contract, hphc: { ...contract.hphc, offPeakPricePerKwhHt } })
        }
      />
      {subscription}
    </div>
  );
}

function TaxFields({
  contract,
  onChange
}: {
  contract: ElectricityContract;
  onChange: (contract: ElectricityContract) => void;
}) {
  const update = (changes: Partial<ElectricityContract["taxes"]>) =>
    onChange({ ...contract, taxes: { ...contract.taxes, ...changes } });

  return (
    <div className="field-grid">
      <NumberField
        label="Accise"
        unit="€/kWh"
        value={contract.taxes.excisePerKwh}
        onChange={(excisePerKwh) => update({ excisePerKwh })}
      />
      <NumberField
        label="CTA"
        unit="€/mois"
        value={contract.taxes.ctaMonthly}
        hint="Ligne « Contribution tarifaire d’acheminement » ramenée au mois"
        onChange={(ctaMonthly) => update({ ctaMonthly })}
      />
      <NumberField
        label="TVA"
        unit="%"
        value={contract.taxes.vatRate}
        onChange={(vatRate) => update({ vatRate })}
      />
    </div>
  );
}

function ContractPanel({ open, onClose, contract, onChange, onReset }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;

    if (!element) {
      return;
    }

    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  const otherOption: TariffOption = contract.option === 'base' ? 'hphc' : 'base';
  const needsRanges = contract.option === 'hphc' || contract.compareOptions;

  return (
    <dialog
      ref={dialog}
      className="panel"
      aria-labelledby="contract-title"
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === dialog.current) {
          onClose();
        }
      }}
    >
      <div className="panel-body">
        <header className="panel-header">
          <div>
            <h2 id="contract-title">Mon contrat</h2>
            <p>Enregistré automatiquement sur cet appareil.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">
            <CloseIcon />
          </button>
        </header>

        <div className="panel-content">
          <section className="panel-section">
            <h3>Contrat</h3>
            <div className="field-grid">
              <label className="field">
                <span>Nom ou fournisseur</span>
                <input
                  type="text"
                  value={contract.name}
                  placeholder="Facultatif"
                  onChange={(event) => onChange({ ...contract, name: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Puissance souscrite</span>
                <select
                  value={contract.subscribedPowerKva}
                  onChange={(event) =>
                    onChange({ ...contract, subscribedPowerKva: Number(event.target.value) })
                  }
                >
                  {SUBSCRIBED_POWERS_KVA.map((power) => (
                    <option key={power} value={power}>
                      {power} kVA
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="panel-section">
            <h3>Option tarifaire</h3>
            <div className="segmented segmented-wide" role="group" aria-label="Option tarifaire">
              {(['base', 'hphc'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={contract.option === option}
                  onClick={() => onChange({ ...contract, option })}
                >
                  {OPTION_LABEL[option]}
                </button>
              ))}
            </div>
            <TariffFields option={contract.option} contract={contract} onChange={onChange} />
            <small>Prix hors taxes, tels qu’ils figurent sur votre facture.</small>
          </section>

          <section className="panel-section">
            <h3>Taxes</h3>
            <TaxFields contract={contract} onChange={onChange} />
            <small>Elles évoluent en général au 1er février et au 1er août : reportez les valeurs de votre dernière facture.</small>
          </section>

          <section className="panel-section">
            <label className="switch-row">
              <span>
                <strong>Comparer avec l’option {OPTION_LABEL[otherOption]}</strong>
                <small>Estime ce que la même consommation aurait coûté.</small>
              </span>
              <input
                type="checkbox"
                className="switch"
                checked={contract.compareOptions}
                onChange={(event) =>
                  onChange({ ...contract, compareOptions: event.target.checked })
                }
              />
            </label>
            {contract.compareOptions && (
              <TariffFields option={otherOption} contract={contract} onChange={onChange} />
            )}
          </section>

          {needsRanges && (
            <section className="panel-section">
              <h3>Plages d’heures creuses</h3>
              <OffPeakEditor
                ranges={contract.offPeakRanges}
                onChange={(offPeakRanges) => onChange({ ...contract, offPeakRanges })}
              />
            </section>
          )}
        </div>

        <footer className="panel-footer">
          <button type="button" className="button button-ghost" onClick={onReset}>
            Réinitialiser
          </button>
          <button type="button" className="button button-primary" onClick={onClose}>
            Terminé
          </button>
        </footer>
      </div>
    </dialog>
  );
}

export default ContractPanel;
