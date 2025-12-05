from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from vector import getRetriever, embedToVectors
from database import (
    get_cached_reviews,
    save_reviews,
    list_cached_places,
    delete_cached_place,
)
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import asyncio
from fastapi.middleware.cors import CORSMiddleware

# reviews = get_cached_reviews("0x4741dc430d5f1069:0x983fa4a49808d3a8")
# all_revies = reviews["reviews"]
# embedToVectors("0x4741dc430d5f1069:0x983fa4a49808d3a8", all_revies)

model = OllamaLLM(model="llama3.2")

template = """
You are an expert in answering questions about restaurants.
Answer the question based on the reviews provided. Be concise and to the point, the answer should not be longer than 60 words.
Do not quote the reviews, only use them to formulate your answer.

Here are some relevent reviews: {reviews}

Here is the question you need to answer: {question}
"""
prompt = ChatPromptTemplate.from_template(template)

chain = prompt | model


class InitChatRequest(BaseModel):
    data_id: str
    api_key: str


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def do_something(data_id: str, api_key: str):
    await asyncio.sleep(1)
    return "initialized"


@app.get("/")
def read_root():
    return {"Hello": "World"}


class InitResponse(BaseModel):
    name: str | None
    data_id: str | None


@app.get("/sleep/{data_id}")
async def sleep_endpoint(data_id: str):
    await asyncio.sleep(2)
    return {"status": "awake"}


from serpapi import GoogleSearch


class ReviewsRequest(BaseModel):
    api_key: str
    target_reviews: int = 8


from datetime import datetime


def prepare_data(all_reviews: dict) -> list[dict]:

    review_texts = [
        review["snippet"].encode("utf-8").decode("unicode-escape")
        for review in all_reviews
    ]

    ratings = [review["rating"] for review in all_reviews]

    iso_dates = [
        datetime.strptime(review["iso_date"], "%Y-%m-%dT%H:%M:%SZ")
        for review in all_reviews
    ]

    dates = [date.strftime("%Y-%m-%d") for date in iso_dates]

    reviews = [
        {
            "text": review_texts[i],
            "rating": ratings[i],
            "date": dates[i],
        }
        for i in range(len(all_reviews))
    ]
    return reviews


@app.post("/reviews/{data_id}")
async def get_reviews(data_id: str, request: ReviewsRequest):
    cached = get_cached_reviews(data_id)
    if cached:
        print(
            f"Returning cached reviews for {cached['name']} ({len(cached['reviews'])} reviews)"
        )
        return {
            "reviews": cached["reviews"],
            "name": cached["name"],
            "data_id": data_id,
            "length": cached["review_count"],
            "cached": True,
            "fetched_at": cached["fetched_at"],
        }

    all_reviews = []
    next_page_token = None
    name = "Unknown Place"
    place_info = {}
    params = {
        "engine": "google_maps_reviews",
        "data_id": data_id,
        "sort_by": "qualityScore",
        "hl": "en",
        "api_key": request.api_key,
    }
    search = GoogleSearch(params)
    results = search.get_dict()
    reviews = results.get("reviews", [])
    all_reviews.extend(reviews)

    place_info = results.get("place_info", {})
    name = place_info.get("title", "Unknown Place")

    pagination = results.get("serpapi_pagination", {})
    next_page_token = pagination.get("next_page_token")
    while next_page_token and len(all_reviews) < request.target_reviews:
        params = {
            "engine": "google_maps_reviews",
            "data_id": data_id,
            "sort_by": "qualityScore",
            "hl": "en",
            "api_key": request.api_key,
            "next_page_token": next_page_token,
            "num": 20,
        }

        search = GoogleSearch(params)
        results = search.get_dict()

        reviews = results.get("reviews", [])
        if not reviews:
            break

        all_reviews.extend(reviews)

        pagination = results.get("serpapi_pagination", {})
        next_page_token = pagination.get("next_page_token")

        print(f"Fetched {len(all_reviews)} reviews so far...")

    with open("debug_reviews.json", "w") as f:
        import json

        json.dump(
            {
                "place_info": place_info,
                "reviews": all_reviews,
                "total_fetched": len(all_reviews),
            },
            f,
            indent=4,
        )

    # Save to cache
    good_data = prepare_data(all_reviews)

    embedToVectors(data_id, good_data)
    save_reviews(data_id, name, good_data)

    return {
        "reviews": all_reviews,
        "name": name,
        "data_id": data_id,
        "length": len(all_reviews),
        "cached": False,
    }


@app.get("/cached-places")
async def get_cached_places():
    """List all cached places."""
    places = list_cached_places()
    return {"places": places, "count": len(places)}


@app.delete("/cached-places/{data_id}")
async def remove_cached_place(data_id: str):
    """Delete a cached place."""
    deleted = delete_cached_place(data_id)
    if deleted:
        return {"message": f"Deleted cache for {data_id}"}
    raise HTTPException(status_code=404, detail="Place not found in cache")


@app.post("/init_chat", response_model=InitResponse)
async def init_chat(request: InitChatRequest):
    data_id = request.data_id
    api_key = request.api_key

    status = await do_something(data_id, api_key)

    if status != "initialized":
        raise HTTPException(status_code=500, detail="Initialization failed")

    return InitResponse(
        name="BAMBA Marha Burger Bár #Astoria BAMBA MARHA BURGER BAR", data_id=data_id
    )


class QuestionRequest(BaseModel):
    question: str


@app.post("/question/{data_id}")
async def ask_question(data_id: str, request: QuestionRequest):
    question = request.question
    retriever = getRetriever(data_id)
    reviews = retriever.invoke(question)
    if not reviews:
        return {
            "answer": "No relevant (or not at all) reviews found to answer the question."
        }
    print(reviews)
    print("\n" * 2)
    result = chain.invoke({"reviews": reviews, "question": question})
    print(result)
    return {"answer": result}


@app.get("/items/{item_id}")
def read_item(item_id: int):
    return {"item_id": item_id}
