import type { ElectricityContract, TimeRange } from '../types/electricityContract';

import './TariffConfiguration.css';

type Props = {
  config: ElectricityContract;
  onChange: (config: ElectricityContract) => void;
};

function TariffConfiguration({
  config,
  onChange
}: Props) {
  const offPeakRanges = config.offPeakRanges ?? [];

  function updateConfig(
    changes: Partial<ElectricityContract>
  ) {
    onChange({
      ...config,
      ...changes
    });
  }

  function updateRange(
    index: number,
    changes: Partial<TimeRange>
  ) {
    const ranges = [...offPeakRanges];

    ranges[index] = {
      ...ranges[index],
      ...changes
    };

    updateConfig({
      offPeakRanges: ranges
    });
  }

  function addRange() {
    updateConfig({
      offPeakRanges: [
        ...offPeakRanges,
        {
          start: '00:00',
          end: '00:00'
        }
      ]
    });
  }

  function removeRange(index: number) {
    updateConfig({
      offPeakRanges: offPeakRanges.filter(
        (_, rangeIndex) => rangeIndex !== index
      )
    });
  }

  return (
    <section className="tariff-configuration">
      <h2>Tariff configuration</h2>

      <div className="tariff-fields">
        <div className="dashboard-field">
          <label htmlFor="pricing-mode">
            Pricing mode
          </label>

          <select
            id="pricing-mode"
            value={config.pricingMode}
            onChange={(event) =>
              updateConfig({
                pricingMode: event.target
                  .value as ElectricityContract['pricingMode']
              })
            }
          >
            <option value="SingleRate">
              Single rate
            </option>

            <option value="PeakOffPeak">
              Peak / off-peak
            </option>
          </select>
        </div>

        <div className="dashboard-field">
          <label htmlFor="monthly-subscription">
            Monthly subscription (€)
          </label>

          <input
            id="monthly-subscription"
            type="number"
            min="0"
            step="0.01"
            value={config.monthlySubscription}
            onChange={(event) =>
              updateConfig({
                monthlySubscription: Number(event.target.value)
              })
            }
          />
        </div>

        {config.pricingMode === 'SingleRate' ? (
          <div className="dashboard-field">
            <label htmlFor="price-per-kwh">
              Price (€/kWh)
            </label>

            <input
              id="price-per-kwh"
              type="number"
              min="0"
              step="0.0001"
              value={config.pricePerKwh ?? 0}
              onChange={(event) =>
                updateConfig({
                  pricePerKwh: Number(event.target.value)
                })
              }
            />
          </div>
        ) : (
          <>
            <div className="dashboard-field">
              <label htmlFor="peak-price">
                Peak hours price (€/kWh)
              </label>

              <input
                id="peak-price"
                type="number"
                min="0"
                step="0.0001"
                value={config.peakPricePerKwh ?? 0}
                onChange={(event) =>
                  updateConfig({
                    peakPricePerKwh: Number(event.target.value)
                  })
                }
              />
            </div>

            <div className="dashboard-field">
              <label htmlFor="off-peak-price">
                Off-peak hours price (€/kWh)
              </label>

              <input
                id="off-peak-price"
                type="number"
                min="0"
                step="0.0001"
                value={config.offPeakPricePerKwh ?? 0}
                onChange={(event) =>
                  updateConfig({
                    offPeakPricePerKwh: Number(event.target.value)
                  })
                }
              />
            </div>
          </>
        )}
      </div>

      {config.pricingMode === 'PeakOffPeak' && (
        <>
          <h3>Off-peak hours</h3>

          <div className="off-peak-ranges">
            {offPeakRanges.map((range, index) => (
              <div
                className="off-peak-range"
                key={index}
              >
                <button
                  type="button"
                  className="off-peak-range-remove"
                  onClick={() => removeRange(index)}
                  aria-label={`Remove time range ${index + 1}`}
                >
                  ×
                </button>

                <div className="dashboard-field">
                  <label htmlFor={`off-peak-start-${index}`}>
                    Start
                  </label>

                  <input
                    id={`off-peak-start-${index}`}
                    type="time"
                    value={range.start}
                    onChange={(event) =>
                      updateRange(index, {
                        start: event.target.value
                      })
                    }
                  />
                </div>

                <div className="dashboard-field">
                  <label htmlFor={`off-peak-end-${index}`}>
                    End
                  </label>

                  <input
                    id={`off-peak-end-${index}`}
                    type="time"
                    value={range.end}
                    onChange={(event) =>
                      updateRange(index, {
                        end: event.target.value
                      })
                    }
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              className="off-peak-range-add"
              onClick={addRange}
            >
              + Add range
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default TariffConfiguration;