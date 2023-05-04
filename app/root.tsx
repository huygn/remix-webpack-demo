import { json, LoaderArgs, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  Links,
  LiveReload,
  NavLink,
  Outlet,
  Scripts,
  useLoaderData,
  useSubmit,
  useTransition as useNavigation,
} from "@remix-run/react";
import { Suspense, useEffect } from "react";

import ErrorPage from "~/lib/error-page";
import styles from "~/index.css";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")!;
  return json({ contacts: [], q });
}

export async function action() {
  return redirect(`/about`);
}

export default function Root() {
  const { contacts, q } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const searching =
    navigation.location &&
    new URLSearchParams(navigation.location.search).has("q");

  useEffect(() => {
    (document.getElementById("q") as HTMLInputElement).value = q;
  }, [q]);
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="description" content="My beautiful React app" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
        <title>My React App</title>
        <Links />
      </head>
      <body>
        <div id="root">
          <div id="sidebar">
            <h1>
              <Link to="/">Remix Webpack Example</Link>
            </h1>
            <div>
              <Form id="search-form" role="search">
                <input
                  id="q"
                  className={searching ? "loading" : ""}
                  aria-label="Search contacts"
                  placeholder="Search"
                  type="search"
                  name="q"
                  defaultValue={q}
                  onChange={(event) => {
                    const isFirstSearch = q == null;
                    submit(event.currentTarget.form, {
                      replace: !isFirstSearch,
                    });
                  }}
                />
                <div id="search-spinner" aria-hidden hidden={!searching} />
                <div className="sr-only" aria-live="polite"></div>
              </Form>
              <Form method="post">
                <button type="submit">New</button>
              </Form>
            </div>
            <nav>
              {contacts.length ? (
                <ul>
                  {contacts.map((contact) => (
                    <li key={contact.id}>
                      <NavLink
                        to={`contacts/${contact.id}`}
                        className={({ isActive }) =>
                          isActive
                            ? "active"
                            : // `isPending` isn't in Remix yet, otherwise this would be easier
                            navigation.state === "loading" &&
                              navigation.location.pathname.endsWith(
                                "/" + contact.id
                              )
                            ? "pending"
                            : ""
                        }
                      >
                        {contact.first || contact.last ? (
                          <>
                            {contact.first} {contact.last}
                          </>
                        ) : (
                          <i>No Name</i>
                        )}{" "}
                        {contact.favorite && <span>★</span>}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  <i>No contacts</i>
                </p>
              )}
            </nav>
          </div>
          <div
            id="detail"
            className={navigation.state === "loading" ? "loading" : ""}
          >
            <Suspense>
              <Outlet />
            </Suspense>
          </div>
        </div>
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export function ErrorBoundary({
  error,
}: {
  error: Error & { statusText?: string };
}) {
  return <ErrorPage error={error} />;
}
