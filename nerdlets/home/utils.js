module.exports = {
  conditions: (account) => {
    return `
    {
      actor {
        account(id: ${account}) {
          nrql(query: "SELECT uniques(conditionId, 5000) as 'conditions' FROM NrAiSignal where numberOfDeviations is not null since 1 month ago", timeout: 90) {
            results
          }
        }
      }
    }
    `;
  },

  currentCondition: (account, conditionId) => {
    return `
    {
      actor {
        account(id: ${account}) {
          alerts {
            nrqlCondition(id: "${conditionId}") {
              name
              id
              terms {
                threshold
              }
              type
              nrql {
                query
              }
            }
          }
        }
      }
    }
    `;
  }
}
