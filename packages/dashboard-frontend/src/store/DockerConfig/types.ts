/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

export type RegistryEntry = {
  url: string;
  username?: string;
  password?: string;
};

export type ContainerCredentials = {
  [key: string]: {
    username?: string;
    password?: string;
  };
};
