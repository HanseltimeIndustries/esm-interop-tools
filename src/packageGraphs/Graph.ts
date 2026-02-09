// TODO: it would be nice to split this into a package for reuse

/**
 * Describes a node in a graph that has a value of a specific type
 * and then points to values of others nodes
 */
export interface Node<T, NodeKey> {
	self: NodeKey;
	from: NodeKey[];
	to: NodeKey[];
	value: T;
}

/**
 * A node that we only know where it goes to at the moment
 */
export interface DownstreamNode<T, NodeKey> {
	self: NodeKey;
	value: T;
	to: NodeKey[];
}

/**
 * If using a compound node key, then we require a node key serializer to get a base string out of it
 */
type NodeKeySerializer<T> = T extends string ? undefined : (t: T) => string;

/**
 * Mnimal "graph" class that takes in a bunch of nodes and then allows you to visit them in a particular order.
 *
 * The value of the node <T> is used as the unique node key for referencing other nodes.
 */
export class Graph<
	T,
	NodeKey,
	NKSerializer extends NodeKeySerializer<NodeKey> = NodeKeySerializer<NodeKey>,
> {
	// This map is partially filled so we allow undefined values internally
	readonly map = new Map<string, Node<T | undefined, NodeKey>>();
	private readonly noFrom = new Set<string>();
	readonly keySerializer: NKSerializer;

	/**
	 *
	 * @param keySerializer - if the graph has a compound key, then you must supply a function that converts a compound key to a string
	 */
	constructor(keySerializer: NKSerializer) {
		this.keySerializer = keySerializer;
	}

	private getNodeKeyStr(nodeKey: NodeKey): string {
		return this.keySerializer
			? this.keySerializer(nodeKey)
			: (nodeKey as string);
	}

	addDownstreamNode(node: DownstreamNode<T, NodeKey>) {
		const nodeKeyStr = this.getNodeKeyStr(node.self);

		// If a previous node prestubbed in the next node, we add it here
		if (this.map.has(nodeKeyStr)) {
			const preStubbedNode = this.map.get(nodeKeyStr)!;
			if (preStubbedNode.value !== undefined) {
				throw new Error(
					`Already added a downstream node of same key: ${nodeKeyStr} - Can't add ${JSON.stringify(node)}`,
				);
			}
			preStubbedNode.to.push(...node.to);
			preStubbedNode.value = node.value;
		} else {
			this.map.set(nodeKeyStr, {
				from: [],
				...node,
			});
			this.noFrom.add(nodeKeyStr);
		}

		// Add to or pre-stub some nodes
		node.to.forEach((n) => {
			const nkStr = this.getNodeKeyStr(n);
			if (this.map.has(nkStr)) {
				const existingNode = this.map.get(nkStr)!;
				existingNode.from.push(node.self);
				if (existingNode.from.length === 1) {
					// We were wrong about this package
					this.noFrom.delete(nkStr);
				}
			} else {
				this.map.set(nkStr, {
					self: n,
					from: [node.self],
					to: [],
					value: undefined,
				} as Node<T | undefined, NodeKey>);
			}
		});
	}

	validate() {
		const errors = [];
		for (let [k, node] of this.map.entries()) {
			if (!node.value) {
				errors.push(
					`Unregistered node: ${k}!  Node was pointed to by: ${JSON.stringify(node.from)}`,
				);
			}
		}
		if (errors.length > 0) {
			throw new Error(errors.join("\n"));
		}
	}

	/**
	 *
	 * @param visit
	 * @param firstArrivalOnly - if set to true, we are saying that we do not care about from where we get to the node, just the first arrival matters
	 *                           This will depend on your visit function, since the visit function can pass parent -> child info that may change based on the node
	 *                           it is coming from - note guestbook is deprecated due to needing to late check optional dependencies
	 */
	async topDownVisitAsync<R>(
		visit: VisitFunction<Node<T, NodeKey>, R>,
		firstArrivalOnly?: boolean,
	) {
		const guestBook = firstArrivalOnly ? new Set<string>() : undefined;
		for (const noFrom of this.noFrom) {
			const node = this.map.get(noFrom)!;
			await this.visitDownNodeAsync(node as Node<T, NodeKey>, visit, guestBook);
		}
	}

	/**
	 *
	 * @param nodeKey - the key that we used to retrieve this node
	 * @param node - the node itself
	 * @param visit - the visit function
	 * @param guestBook - This is used to track if we have already visited the node - note this means we don't expect the visit function to change results
	 *                    regardless of the node that we come from
	 * @param prevResult - the result of the last node that got here
	 * @returns
	 */
	async visitDownNodeAsync<R>(
		node: Node<T, NodeKey>,
		visit: VisitFunction<Node<T, NodeKey>, R>,
		guestBook?: Set<string>,
		prevResult?: R,
	) {
		if (guestBook?.has(this.getNodeKeyStr(node.self))) {
			// We already visited this node
			return;
		}
		const [result, stop] = await visit(node, prevResult);
		if (stop) {
			// We let the visitor control travel
			return;
		}
		await Promise.all(
			node.to.map((n) => {
				return this.visitDownNodeAsync(
					this.map.get(this.getNodeKeyStr(n))! as Node<T, NodeKey>,
					visit,
					guestBook,
					result,
				);
			}),
		);
	}
}

type StopVisiting = boolean;

/**
 * This function will be called for each visit while traversing along the "to" nodes.  You can return
 * a result from the visit function that will be provided to any of the "to" visitors as the previous result.
 *
 * Additionally, if you return a boolean value in the second tuple, it can stop any further downstream visits from this
 * particular visitor function.  (Keep in mind that a visitor can only stop further travel from itself, so if there are
 * multiple visits from multiple nodes each visitor will need to stop further travel.  If you do use a guestbook, in a
 * visiting function, that would stop travel fromm the visitor function that first calls stop.)
 */
type VisitFunction<Node, R> = (
	currentNode: Node,
	previousResult?: R,
) => Promise<[R, StopVisiting]>;
