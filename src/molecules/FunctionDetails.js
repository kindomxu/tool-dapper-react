import React, { Component } from "react"
import { Div } from "glamorous"
import TransactionResult from "../atoms/TransactionResult"
import TransactionError from "../atoms/TransactionError"
import { TransactionReceipt } from "../atoms/TransactionReceipt"
import { DetailsHeader } from "../atoms/DetailsHeader"
import ProgressButton, { STATE } from "react-progress-button"
import {MainDiv, FunctionParamLayout, FunctionPropertiesDiv, FunctionParamList, InputBar, ParamInputDiv } from './FunctionDetailsComponents'

class FunctionDetails extends Component {
  state = {
    method: {
      inputs: [],
      outputs: [],
      name: `loading...`,
      type: ``,
      executeBtnState: STATE.LOADING,
    },
    service: this.props.service,
    transactionResult: undefined,
    transactionReceipt: undefined,
    transactionError: undefined,
    inputs: undefined,
  }

  componentDidMount() {
    this.updateInputs()
  }

  componentDidUpdate() {
    this.updateInputs()
  }

  updateInputs = () => {
    const { match } = this.props
    const { method } = this.state
    const { signature } = method

    const methodSig = match.params.method

    if (signature !== methodSig) {
      const contractName = match.params.contract
      this.contract = this.state.service.contractNamed(contractName)
      if (this.contract) {
        const { _jsonInterface } = this.contract
        const newMethod = this.methodObject(_jsonInterface, methodSig)
        if (newMethod) {
          this.setState({
            method: newMethod,
            transactionResult: undefined,
            transactionError: undefined,
            transactionReceipt: undefined,
            inputs: [],
            value: 0,
            executeBtnState: STATE.NOTHING,
          })
        }
      }
    }
  }

  methodObject = (methods, sig) => {
    const methodObj = methods.find(method => method.signature === sig)
    if (methodObj) {
      return methodObj
    }
    return undefined
  }

  handleChange = e => {
    const { method } = this.state
    const inputs =
      this.state.inputs && this.state.inputs.length > 0
        ? this.state.inputs
        : method.inputs

    const newInputs = inputs.map(input => {
      if (input.name === e.target.name) {
        return { ...input, value: e.target.value }
      }
      return input
    })

    if (e.target.name === `Value`) {
      this.setState({ value: e.target.value })
    }
    this.setState({ inputs: newInputs })
  }

  handleExecute = async () => {
    const { method } = this.state

    this.setState({
      transactionResult: undefined,
      transactionError: undefined,
      transactionReceipt: undefined,
      executeBtnState: STATE.LOADING,
    })

    const methodName = method.name
    const { stateMutability } = method
    const inputParams = this.state.inputs.map(i => i.value)

    try {
      const user = this.state.service.getCurrentUser()
      if (!user) {
        throw new Error(`No Current User, Refresh Page, or Login Metamask`)
      }
      if (
        this.state.value === 0 &&
        (inputParams.length === 0 ||
          stateMutability === `view` ||
          stateMutability === `pure`)
      ) {
        // console.log(
        //   `Calling view or pure method \'${methodName}\' with params ${JSON.stringify(
        //     inputParams,
        //   )}`,
        // )
        const result = await this.contract.methods[methodName](
          ...inputParams,
        ).call()
        this.setState({
          transactionResult: result,
          executeBtnState: STATE.success,
        })
      } else {
        // console.log(
        //   `Calling ${this.contract} ${methodName} with params ${JSON.stringify(
        //     inputParams,
        //   )}`,
        // )
        // For debugging purposes if you need to examine the call to web3 provider:
        // this.contract.methods
        //   .mint(...inputParams)
        //   .send({ from: user, value: this.state.value })
        await this.contract.methods[methodName](...inputParams)
          .send({ from: user, value: this.state.value })
          .then(transactionReceipt => {
            console.log(`Got receipts`, transactionReceipt)
            this.setState({
              transactionReceipt,
              executeBtnState: STATE.SUCCESS,
            })
          })
          .catch(e =>
            this.setState({
              transactionError: e,
              executeBtnState: STATE.ERROR,
            }),
          )
      }
    } catch (e) {
      this.setState({
        transactionError: e,
        executeBtnState: STATE.ERROR,
      })
    }
  }

  getInputValue = name => {
    let val = ``
    const input = this.state.inputs.filter(input => input.name === name)
    if (input) {
      val = input[0] ? (input[0].value ? input[0].value : ``) : ``
    }
    return val
  }

  getInputs = method => {
    const results = method.inputs.map((input, index) => {
      if (input.name === ``) {
        input.name = `param${index}`
      }
      return (
        <ParamInputDiv key={input.name}>
          {input.name}
          <InputBar
            type='text'
            name={input.name}
            placeholder={input.type}
            onChange={this.handleChange}
            value={this.getInputValue(input.name)}
          />
        </ParamInputDiv>
      )
    })

    if (method.stateMutability === `payable`) {
      results.push(
        <ParamInputDiv key='Value'>
          Value To Transfer
          <InputBar
            type='text'
            name='Value'
            placeholder='ETH (wei)'
            onChange={this.handleChange}
            value={this.state.value}
          />
        </ParamInputDiv>,
      )
    }
    return results
  }

  functionProperties = method => (
    <Div>
      {method.name}(
      {method.inputs.map(input => `${input.type} ${input.name}`).join(`, `)})
      <Div>{method.stateMutability}</Div>
      {method.outputs.length === 0
        ? ``
        : `returns (` +
          method.outputs
            .map(
              output => `${output.type}${output.name ? ` ` : ``}${output.name}`,
            )
            .join(`, `) +
          `)`}
    </Div>
  )

  render() {
    const {
      method,
      transactionResult,
      transactionReceipt,
      transactionError,
    } = this.state

    return (
      <MainDiv>
        <DetailsHeader>{method.name}()</DetailsHeader>
        <FunctionParamLayout>
          <FunctionPropertiesDiv>
            {this.functionProperties(method)}
          </FunctionPropertiesDiv>
          <FunctionParamList>{this.getInputs(method)}</FunctionParamList>
          <ProgressButton
            state={this.state.executeBtnState}
            onClick={this.handleExecute}
          >
            EXECUTE
          </ProgressButton>
        </FunctionParamLayout>

        <TransactionResult result={transactionResult} />
        <TransactionError error={transactionError} />
        <TransactionReceipt {...transactionReceipt} />
      </MainDiv>
    )
  }
}
export default FunctionDetails
