// GitHub API service for fetching repository structure and file contents

export interface GitHubTreeItem {
  path: string;
  type: 'tree' | 'blob';
  sha: string;
  url?: string;
  size?: number;
}

export interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: TreeNode[];
  sha?: string;
  size?: number;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

interface GitHubContentResponse {
  content: string;
  encoding: string;
  size: number;
  sha: string;
}

const CACHE_KEY_PREFIX = 'github_tree_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Get cached data if still valid
 */
function getCached<T>(key: string): T | null {
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;

    const parsed: CachedData<T> = JSON.parse(cached);
    const now = Date.now();

    if (now - parsed.timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Cache data with timestamp
 */
function setCache<T>(key: string, data: T): void {
  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
}

/**
 * Fetch repository tree structure from GitHub API
 */
export async function fetchGitHubTree(
  owner: string,
  repo: string,
  ref: string = 'main'
): Promise<GitHubTreeItem[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}${owner}_${repo}_${ref}`;

  // Check cache first
  const cached = getCached<GitHubTreeItem[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      const resetTime = rateLimitReset
        ? new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString()
        : 'soon';
      throw new Error(`GitHub rate limit exceeded. Try again at ${resetTime}.`);
    }
    throw new Error(`Failed to fetch repository tree: ${response.statusText}`);
  }

  const data: GitHubTreeResponse = await response.json();

  if (data.truncated) {
    console.warn('GitHub tree response was truncated. Some files may be missing.');
  }

  // Cache the result
  setCache(cacheKey, data.tree);

  return data.tree;
}

/**
 * Fetch file content from GitHub API
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('GitHub rate limit exceeded. Please try again later.');
    }
    throw new Error(`Failed to fetch file content: ${response.statusText}`);
  }

  const data: GitHubContentResponse = await response.json();

  // GitHub returns base64-encoded content
  if (data.encoding === 'base64') {
    try {
      return atob(data.content.replace(/\n/g, ''));
    } catch (error) {
      throw new Error('Failed to decode file content');
    }
  }

  return data.content;
}

/**
 * Transform flat GitHub tree items into nested tree structure
 */
export function transformToTree(
  items: GitHubTreeItem[],
  repoPrefix: string = ''
): TreeNode {
  const root: TreeNode = {
    id: repoPrefix || 'root',
    name: repoPrefix || 'Root',
    type: 'folder',
    path: '',
    children: [],
  };

  // Sort items by path to ensure parent folders are created before children
  const sortedItems = [...items].sort((a, b) => a.path.localeCompare(b.path));

  // Create a map to track all nodes by their path
  const nodeMap = new Map<string, TreeNode>();
  nodeMap.set('', root);

  for (const item of sortedItems) {
    const pathParts = item.path.split('/');
    const name = pathParts[pathParts.length - 1];
    const parentPath = pathParts.slice(0, -1).join('/');

    // Create the node
    const node: TreeNode = {
      id: `${repoPrefix}/${item.path}`,
      name,
      type: item.type === 'tree' ? 'folder' : 'file',
      path: item.path,
      sha: item.sha,
      size: item.size,
      children: item.type === 'tree' ? [] : undefined,
    };

    // Add node to map
    nodeMap.set(item.path, node);

    // Find or create parent node
    let parent = nodeMap.get(parentPath);

    if (!parent) {
      // Create missing parent folders (shouldn't happen with sorted items, but just in case)
      const parentParts = parentPath.split('/');
      let currentPath = '';

      for (const part of parentParts) {
        if (!part) continue;

        const prevPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!nodeMap.has(currentPath)) {
          const parentNode: TreeNode = {
            id: `${repoPrefix}/${currentPath}`,
            name: part,
            type: 'folder',
            path: currentPath,
            children: [],
          };

          nodeMap.set(currentPath, parentNode);

          const grandParent = nodeMap.get(prevPath) || root;
          grandParent.children?.push(parentNode);
        }
      }

      parent = nodeMap.get(parentPath) || root;
    }

    // Add node to parent's children
    if (parent.children) {
      parent.children.push(node);
    }
  }

  // Sort children recursively (folders first, then alphabetically)
  function sortChildren(node: TreeNode): void {
    if (!node.children) return;

    node.children.sort((a, b) => {
      // Folders before files
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      // Alphabetically within type
      return a.name.localeCompare(b.name);
    });

    // Recursively sort children
    node.children.forEach(sortChildren);
  }

  sortChildren(root);

  return root;
}

/**
 * Combine frontend and backend repository trees into a unified structure
 */
export function combineRepos(feTree: TreeNode, beTree: TreeNode): TreeNode {
  const root: TreeNode = {
    id: 'atlantium-root',
    name: 'Atlantium',
    type: 'folder',
    path: '',
    children: [
      {
        ...feTree,
        id: 'frontend',
        name: 'Frontend',
      },
      {
        ...beTree,
        id: 'backend',
        name: 'Backend',
      },
    ],
  };

  return root;
}

/**
 * Fetch and combine both Atlantium repositories
 */
export async function fetchAtlantiumCodebase(): Promise<TreeNode> {
  const owner = 'AtlantiumInc';

  // Fetch both repos in parallel, tolerating individual failures
  const [feResult, beResult] = await Promise.allSettled([
    fetchGitHubTree(owner, 'Atlantium-FE', 'main'),
    fetchGitHubTree(owner, 'Atlantium-BE', 'main'),
  ]);

  const children: TreeNode[] = [];

  if (feResult.status === 'fulfilled') {
    const feTree = transformToTree(feResult.value, 'frontend');
    children.push({ ...feTree, id: 'frontend', name: 'Frontend' });
  } else {
    console.warn('Failed to fetch Frontend repo:', feResult.reason);
  }

  if (beResult.status === 'fulfilled') {
    const beTree = transformToTree(beResult.value, 'backend');
    children.push({ ...beTree, id: 'backend', name: 'Backend' });
  } else {
    console.warn('Failed to fetch Backend repo:', beResult.reason);
  }

  if (children.length === 0) {
    throw new Error('Failed to fetch any repositories. They may be private or unavailable.');
  }

  return {
    id: 'atlantium-root',
    name: 'Atlantium',
    type: 'folder',
    path: '',
    children,
  };
}
