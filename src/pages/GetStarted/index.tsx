/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React, { Suspense } from 'react';
import { History } from 'history';
import { connect, ConnectedProps } from 'react-redux';
import { load } from 'js-yaml';
import {
  AlertVariant,
  PageSection,
  PageSectionVariants,
  Tab,
  Tabs,
  Title,
} from '@patternfly/react-core';
import Fallback from '../../components/Fallback';
import Head from '../../components/Head';
import { lazyInject } from '../../inversify.config';
import { AppAlerts } from '../../services/alerts/appAlerts';
import * as WorkspaceStore from '../../store/Workspaces';
import { AppState } from '../../store';
import { AlertItem, GettingStartedTab } from '../../services/helpers/types';
import { ROUTE } from '../../route.enum';

const SamplesListTab = React.lazy(() => import('./GetStartedTab'));
const CustomWorkspaceTab = React.lazy(() => import('./CustomWorkspaceTab'));

type Props = MappedProps & {
  history: History;
}

type State = {
  activeTabKey: GettingStartedTab;
}

export class GetStarted extends React.PureComponent<Props, State> {

  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);

    const activeTabKey = this.getActiveTabKey();

    this.state = {
      activeTabKey,
    };
  }

  public componentDidUpdate(): void {
    const activeTabKey = this.getActiveTabKey();
    if (this.state.activeTabKey !== activeTabKey) {
      this.setState({ activeTabKey });
    }
  }

  private getTitle(): string {
    const productName = this.props.branding.data.name;
    const titles: { [key in GettingStartedTab]: string } = {
      'get-started': `Getting Started with ${productName}`,
      'custom-workspace': 'Create Custom Workspace',
    };
    return titles[this.state.activeTabKey];
  }

  private getActiveTabKey(): GettingStartedTab {
    const { pathname, search } = this.props.history.location;

    if (search) {
      const searchParam = new URLSearchParams(search.substring(1));
      if (pathname === ROUTE.GET_STARTED && searchParam.get('tab') as GettingStartedTab === 'custom-workspace') {
        return 'custom-workspace';
      }
    }

    return 'get-started';
  }

  private async createWorkspace(
    devfile: api.che.workspace.devfile.Devfile,
    stackName: string | undefined,
    infrastructureNamespace: string | undefined,
  ): Promise<void> {
    const attr = stackName ? { stackName } : {};
    let workspace: che.Workspace;
    try {
      workspace = await this.props.createWorkspaceFromDevfile(devfile, undefined, infrastructureNamespace, attr);
    } catch (e) {
      this.showAlert({
        key: 'new-workspace-failed',
        variant: AlertVariant.danger,
        title: e.message
      });
      throw new Error(e.message);
    }

    const workspaceName = workspace.devfile.metadata.name;
    this.showAlert({
      key: 'new-workspace-success',
      variant: AlertVariant.success,
      title: `Workspace ${workspaceName} has been created.`
    });

    // force start for the new workspace
    try {
      await this.props.startWorkspace(workspace);
      this.props.history.push(`/ide/${workspace.namespace}/${workspaceName}`);
    } catch (error) {
      this.showAlert({
        key: 'start-workspace-failed',
        variant: AlertVariant.warning,
        title: `Workspace ${workspaceName} failed to start. ${error}`,
      });
      throw new Error(error);
    }
  }

  private handleDevfile(devfile: che.WorkspaceDevfile, attrs: { stackName?: string, infrastructureNamespace?: string }): Promise<void> {
    return this.createWorkspace(devfile, attrs.stackName, attrs.infrastructureNamespace);
  }

  private handleDevfileContent(devfileContent: string, attrs: { stackName?: string, infrastructureNamespace?: string }): Promise<void> {
    try {
      const devfile = load(devfileContent);
      return this.createWorkspace(devfile, attrs.stackName, attrs.infrastructureNamespace);
    } catch (e) {
      const errorMessage = 'Failed to parse the devfile';
      this.showAlert({
        key: 'parse-devfile-failed',
        variant: AlertVariant.danger,
        title: errorMessage + '.'
      });
      throw new Error(errorMessage + ', \n' + e);
    }
  }

  private showAlert(alert: AlertItem): void {
    this.appAlerts.showAlert(alert);
  }

  private handleTabClick(event: React.MouseEvent<HTMLElement, MouseEvent>, activeTabKey: React.ReactText): void {
    this.props.history.push(`${ROUTE.GET_STARTED}?tab=${activeTabKey}`);

    this.setState({
      activeTabKey: activeTabKey as GettingStartedTab,
    });
  }

  render(): React.ReactNode {
    const { activeTabKey } = this.state;
    const title = this.getTitle();
    const getStartedTab: GettingStartedTab = 'get-started';
    const customWorkspaceTab: GettingStartedTab = 'custom-workspace';

    return (
      <React.Fragment>
        <Head pageName="Get Started" />
        <PageSection variant={PageSectionVariants.light}>
          <Title headingLevel={'h1'}>{title}</Title>
        </PageSection>
        <PageSection
          variant={PageSectionVariants.light}
          className='pf-c-page-section-no-padding'
          isFilled={false}
        >
          <Tabs
            activeKey={activeTabKey}
            onSelect={(event, tabKey) => this.handleTabClick(event, tabKey)}>
            <Tab
              eventKey={getStartedTab}
              title="Get Started"
            >
              <Suspense fallback={Fallback}>
                <SamplesListTab
                  onDevfile={(devfileContent: string, stackName: string) => {
                    return this.handleDevfileContent(devfileContent, { stackName });
                  }}
                />
              </Suspense>
            </Tab>
            <Tab eventKey={customWorkspaceTab} title="Custom Workspace">
              <Suspense fallback={Fallback}>
                <CustomWorkspaceTab
                  onDevfile={(devfile: che.WorkspaceDevfile, infrastructureNamespace?: string) => {
                    return this.handleDevfile(devfile, { infrastructureNamespace });
                  }}
                />
              </Suspense>
            </Tab>
          </Tabs>
        </PageSection>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  branding: state.branding,
});

const connector = connect(
  mapStateToProps,
  WorkspaceStore.actionCreators
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(GetStarted);
