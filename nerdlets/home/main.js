import React from 'react';
import { Dropdown, DropdownItem, Icon, LineChart, NerdGraphQuery, TableChart, TextField, Tooltip } from 'nr1';
import { Dimmer, Loader } from 'semantic-ui-react';
const query = require('./utils');


export default class Main extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedAccount: null,
      loading: true,
      firstLoad: true,
      conditionIds: [],
      threshold: 0,
      selectedCondition: null,
      conditionSearch: '',
    }

    this.handleChange = this.handleChange.bind(this);
  }

  async componentDidMount() {
    let { account } = this.props;

    if (account !== null) {
      await this.getData();
    }
    await this.setState({ loading: false });
  }

  async componentDidUpdate(prevProps) {
    if (prevProps.account !== this.props.account) {
      await this.setState({ selectedAccount: this.props.account, loading: true, firstLoad: false, selectedCondition: null, threshold: 0 });

      if (this.props.account !== null) {
        await this.getData();
      }

      await this.setState({ loading: false });
    }
  }

  async getData() {
    let { selectedAccount } = this.state;
    let opts = [];

    let conditionIds = await this.getConditions(selectedAccount);

    conditionIds.forEach(c => {
      opts.push({ id: c, name: c });
    })

    this.setState({ conditionIds: opts });
  }

  async getConditions(a) {
    const res = await NerdGraphQuery.query({
      query: query.conditions(a.id)
    });

    if (res.error) {
      console.debug(`Failed to retrieve conditions for account: ${a.id}`);
      console.debug(res.error);
      return [];
    } else {
      const conditions = res.data.actor.account.nrql.results[0].conditions;
      return conditions;
    }
  }

  async getConditionDetail(a, c) {
    const res = await NerdGraphQuery.query({
      query: query.currentCondition(a.id, c.id)
    });

    if (res.error) {
      console.debug(`Failed to retrieve condition detail for condition id: ${c.id}`);
      console.debug(res.error);
      return null;
    } else {
      const detail = res.data.actor.account.alerts.nrqlCondition;
      return detail;
    }
  }

  async handleChange(c) {
    let { selectedAccount, conditionSearch } = this.state;

    await this.setState({ loading: true, conditionSearch: '' });
    let detail = await this.getConditionDetail(selectedAccount, c);

    if (detail !== null) {
      c.query = detail.nrql.query;
      c.currentThreshold = detail.terms[0].threshold;
      await this.setState({ selectedCondition: c, loading: false, threshold: c.currentThreshold });
    } else {
      await this.setState({ selectedCondition: c, loading: false });
    }
  }

  renderConditionDropdown() {
    const { conditionIds, conditionSearch, selectedCondition } = this.state;

    let filteredConditions = [...conditionIds];
    if (conditionSearch && conditionSearch.length > 0) {
      filteredConditions = conditionIds.filter((c) => {
        let numString = c.name.toString()
        return numString.includes(conditionSearch);
      });
    }

    return (
      <Dropdown
        style={{ marginLeft: '10px' }}
        title={selectedCondition ? selectedCondition.name : 'Condition Filter'}
        items={conditionIds}
        search={conditionSearch}
        onSearch={(e) => this.setState({ conditionSearch: e.target.value })}
      >
      {filteredConditions.map((cond) => (
        <DropdownItem onClick={() => this.handleChange(cond)} key={cond.id}>{cond.name}</DropdownItem>
      ))}
      </Dropdown>
    )
  }

  updateTextBox(e) {
    if (e.target.value == '' || e.target.value == null) {
      this.setState({ threshold: '' });
    } else {
      this.setState({ threshold: e.target.value });
    }
  }

  renderThresholdTextBox() {
    let { threshold } = this.state;

    return (
      <TextField
        style={{ marginLeft: '10px' }}
        placeholder='threshold...'
        value={threshold}
        onChange={(e) => this.updateTextBox(e)}
      />
    )
  }

  renderInfo() {
    let { selectedCondition } = this.state;

    if (selectedCondition.query) {
      return (
        <div className="info">
          <p>This view aims to optimize the standard deviation threshold within baseline alert conditions. A good rule of thumb is to set critical threshold in a baseline alert condition to the p75 (75th percentile) std deviation value shown.</p>
          <h3>How to use</h3>
            <p>Potential thresholds are surfaced in the <b>Candidate Thresholds</b> table. These are derived from a week's worth of std deviations, compared with 2 weeks prior.</p>
            <p>The <b>Condition Signal</b> chart plots the actual condition signal (over 1 week), and the <b>Deviations vs Current Threshold</b> chart plots the # of deviations (over the past week, compared with 2 weeks prior). These 2 trends can be used in conjuction to determine how much deviation occurs at certain signal thresholds.</p>
            <p>Current model behavior can be examined by looking at the <b>Model Behavior</b> line chart - This displays the actual signal value, predicted value by the model (which is updated as it learns the patterns), and the upper threshold calculated based on the std dev threshold set. If the signal value is consistently above the upper threshold, that is a good indicator the threshold needs to be tuned. If the predictedValue trend is not in close alignment with the signalValue trend, that is an indicator the model is not trained well enough yet.</p>
        </div>
      )
    }

    return (
      <div className="info">
        <p>This view aims to optimize the standard deviation threshold within baseline alert conditions. A good rule of thumb is to set critical threshold in a baseline alert condition to the p75 (75th percentile) std deviation value shown.</p>
        <h3>How to use</h3>
          <p>Potential thresholds are surfaced in the <b>Candidate Thresholds</b> table. These are derived from a week's worth of std deviations, compared with 2 weeks prior.</p>
          <p>The <b>Deviations vs Current Threshold</b> chart plots the # of deviations (over the past week, compared with 2 weeks prior). This trend can be used to analyze actual deviations versus the current deviation threshold set, to better understand the normal behavior and to tune the current threshold as necessary.</p>
          <p>Current model behavior can be examined by looking at the <b>Model Behavior</b> line chart - This displays the actual signal value, predicted value by the model (which is updated as it learns the patterns), and the upper threshold calculated based on the std dev threshold set. If the signal value is consistently above the upper threshold, that is a good indicator the threshold needs to be tuned. If the predictedValue trend is not in close alignment with the signalValue trend, that is an indicator the model is not trained well enough yet.</p>
      </div>
    )
  }

  renderConditionQuery() {
    let { selectedAccount, selectedCondition } = this.state;

    let conditionQ = selectedCondition.query + ' SINCE 1 WEEK AGO TIMESERIES';

    if (selectedCondition.query) {
      return (
        <div>
          <h4>
            <Tooltip
              text={conditionQ}
              placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
            >
              <Icon className="tooltip" type={Icon.TYPE.INTERFACE__INFO__HELP}/>
            </Tooltip>
            Condition Signal
          </h4>
          <LineChart
            accountIds={[selectedAccount.id]}
            query={conditionQ}
            fullWidth
          />
        </div>
      )
    }
    return <div></div>
  }

  renderData() {
    let { selectedAccount, selectedCondition, threshold } = this.state;

    let candidateQ = `SELECT average(deviations) as 'avg', percentile(deviations, 75) as 'p75', percentile(deviations, 95) as 'p95' FROM (FROM NrAiSignal SELECT max(abs(numberOfDeviations)) as 'deviations' WHERE conditionId = ${selectedCondition == null ? 0 : selectedCondition.id} TIMESERIES 1 hour LIMIT MAX) since 1 week ago compare with 2 weeks ago FACET string(${threshold}) as 'Current Threshold'`;
    let deviationTrendQ = `FROM NrAiSignal SELECT max(abs(numberOfDeviations)), (${threshold} or 0) as 'Current Threshold' WHERE conditionId = ${selectedCondition == null ? 0 : selectedCondition.id} SINCE 1 week ago TIMESERIES 30 minutes COMPARE WITH 2 weeks ago`;
    let modelBehaviorQ = `FROM NrAiSignal SELECT latest(signalValue), latest(predictedValue), latest(predictedValue + (standardDeviation * 7)) as 'Upper Threshold' WHERE conditionId = ${selectedCondition == null ? 0 : selectedCondition.id} SINCE 1 week ago TIMESERIES 30 minutes`;

    if (selectedCondition !== null) {
      return (
        <div>
          {this.renderInfo()}
          <div className="candidateTable">
            <h4>
              <Tooltip
                text={candidateQ}
                placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
              >
                <Icon className="tooltip" type={Icon.TYPE.INTERFACE__INFO__HELP}/>
              </Tooltip>
              Candidate Thresholds
            </h4>
            <TableChart
              accountIds={[selectedAccount.id]}
              query={candidateQ}
              fullWidth
              style={{display: 'inline-block'}}
            />
          </div>
          {this.renderConditionQuery()}
          <div className="topPadding">
            <h4>
              <Tooltip
                text={deviationTrendQ}
                placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
              >
                <Icon className="tooltip" type={Icon.TYPE.INTERFACE__INFO__HELP}/>
              </Tooltip>
              Deviations vs Current Threshold
            </h4>
            <LineChart
              accountIds={[selectedAccount.id]}
              query={deviationTrendQ}
              fullWidth
            />
          </div>
          <div className="topPadding">
            <h4>
              <Tooltip
                text={modelBehaviorQ}
                placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
              >
                <Icon className="tooltip" type={Icon.TYPE.INTERFACE__INFO__HELP}/>
              </Tooltip>
              Model Behavior
            </h4>
            <LineChart
              accountIds={[selectedAccount.id]}
              query={modelBehaviorQ}
              fullWidth
            />
          </div>
        </div>
      )
    } else {
      return <h3>Select condition id from dropdown above</h3>
    }

  }

  render() {
    let { firstLoad, loading, conditionIds } = this.state;

    if (loading) {
      return (
        <>
          <Dimmer active={loading}>
            <Loader size="medium">Loading</Loader>
          </Dimmer>
        </>
      )
    } else {

      if (conditionIds.length > 0 && !firstLoad) {
        return (
          <>
            {this.renderConditionDropdown()}
            {this.renderThresholdTextBox()}
            {this.renderData()}
          </>
        )
      }

      if (conditionIds.length == 0 && !firstLoad) {
        return (
          <h3>No active baseline conditions in selected account or error occurred fetching conditions.</h3>
        )
      }
    }

    return (
      <h3>Select account above to get started</h3>
    )
  }
}
